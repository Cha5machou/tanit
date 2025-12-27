from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langsmith import Client
from typing import Optional, Dict, Any, List, AsyncIterator
import os
from app.core.config import settings
from app.core.logging import logger
from app.services.storage import StorageService
import uuid
from datetime import datetime
from google.cloud import firestore

# Initialize LangSmith
langsmith_client = None
if settings.LANGSMITH_API_KEY:
    langsmith_client = Client(api_key=settings.LANGSMITH_API_KEY)
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGSMITH_API_KEY
    if settings.LANGSMITH_PROJECT:
        os.environ["LANGCHAIN_PROJECT"] = settings.LANGSMITH_PROJECT


class AIAgentService:
    """Service for AI Agent operations"""
    
    # Store vector stores and memories per conversation
    _vector_stores: Dict[str, Any] = {}
    _memories: Dict[str, ConversationBufferMemory] = {}
    _chains: Dict[str, Any] = {}
    
    @staticmethod
    def _get_embeddings(provider: str = "openai"):
        """Get embeddings based on provider"""
        if provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not configured")
            return OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
        elif provider == "gemini":
            if not settings.GOOGLE_API_KEY:
                raise ValueError("GOOGLE_API_KEY not configured")
            return GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=settings.GOOGLE_API_KEY
            )
        else:
            raise ValueError(f"Unsupported embedding provider: {provider}")
    
    @staticmethod
    def _get_llm(provider: str = "openai", model: Optional[str] = None):
        """Get LLM based on provider"""
        if provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not configured")
            model_name = model or "gpt-4o-mini"
            return ChatOpenAI(
                model=model_name,
                openai_api_key=settings.OPENAI_API_KEY,
                temperature=0.7
            )
        elif provider == "gemini":
            if not settings.GOOGLE_API_KEY:
                raise ValueError("GOOGLE_API_KEY not configured")
            model_name = model or "gemini-2.0-flash-exp"
            return ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.7
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
    
    @staticmethod
    def _load_documents() -> List[str]:
        """Load all documents from GCS"""
        try:
            files = StorageService.list_files()
            documents = []
            for file_info in files:
                file_data = StorageService.get_file(file_info["filename"])
                if file_data and file_data.get("content"):
                    documents.append(file_data["content"])
            return documents
        except Exception as e:
            logger.error(f"Error loading documents: {e}")
            return []
    
    @staticmethod
    def _create_vector_store(embedding_provider: str = "openai", conversation_id: Optional[str] = None):
        """Create or get vector store for a conversation"""
        cache_key = f"{embedding_provider}_{conversation_id or 'default'}"
        
        if cache_key in AIAgentService._vector_stores:
            return AIAgentService._vector_stores[cache_key]
        
        # Load documents
        documents = AIAgentService._load_documents()
        if not documents:
            raise ValueError("No documents available. Please upload documents first.")
        
        # Split documents
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        texts = []
        for doc in documents:
            texts.extend(text_splitter.split_text(doc))
        
        # Create embeddings
        embeddings = AIAgentService._get_embeddings(embedding_provider)
        
        # Create vector store using ChromaDB (persistent storage)
        # Use a unique collection name per embedding provider
        collection_name = f"ai_documents_{embedding_provider}"
        vector_store = Chroma.from_texts(
            texts=texts,
            embedding=embeddings,
            collection_name=collection_name,
            persist_directory=None  # In-memory for now, can be persisted later
        )
        AIAgentService._vector_stores[cache_key] = vector_store
        
        return vector_store
    
    @staticmethod
    def _get_memory(conversation_id: str) -> ConversationBufferMemory:
        """Get or create memory for a conversation"""
        if conversation_id not in AIAgentService._memories:
            AIAgentService._memories[conversation_id] = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                output_key="answer"
            )
        return AIAgentService._memories[conversation_id]
    
    @staticmethod
    def _get_chain(
        conversation_id: str,
        embedding_provider: str = "openai",
        llm_provider: str = "openai",
        llm_model: Optional[str] = None
    ):
        """Get or create chain for a conversation"""
        cache_key = f"{conversation_id}_{embedding_provider}_{llm_provider}_{llm_model or 'default'}"
        
        if cache_key in AIAgentService._chains:
            return AIAgentService._chains[cache_key]
        
        # Get vector store
        vector_store = AIAgentService._create_vector_store(embedding_provider, conversation_id)
        
        # Get memory
        memory = AIAgentService._get_memory(conversation_id)
        
        # Get LLM
        llm = AIAgentService._get_llm(llm_provider, llm_model)
        
        # Create prompt template
        template = """You are a helpful AI assistant that answers questions based on the provided context.
        
Context: {context}

Question: {question}

Answer:"""
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )
        
        # Create chain
        chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=vector_store.as_retriever(search_kwargs={"k": 3}),
            memory=memory,
            combine_docs_chain_kwargs={"prompt": prompt},
            return_source_documents=True
        )
        
        AIAgentService._chains[cache_key] = chain
        return chain
    
    @staticmethod
    async def query(
        question: str,
        conversation_id: Optional[str] = None,
        embedding_provider: str = "openai",
        llm_provider: str = "openai",
        llm_model: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Query the AI agent"""
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
        
        try:
            chain = AIAgentService._get_chain(
                conversation_id,
                embedding_provider,
                llm_provider,
                llm_model
            )
            
            # Run chain
            result = await chain.ainvoke({"question": question})
            
            # Extract answer and sources
            answer = result.get("answer", "")
            source_documents = result.get("source_documents", [])
            
            # Calculate tokens (approximate)
            tokens_used = len(question.split()) + len(answer.split())
            
            return {
                "answer": answer,
                "conversation_id": conversation_id,
                "tokens_used": tokens_used,
                "sources": [doc.page_content[:200] for doc in source_documents[:3]],
            }
        except Exception as e:
            logger.error(f"Error querying AI agent: {e}")
            raise
    
    @staticmethod
    async def query_stream(
        question: str,
        conversation_id: Optional[str] = None,
        embedding_provider: str = "openai",
        llm_provider: str = "openai",
        llm_model: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> AsyncIterator[str]:
        """Query the AI agent with streaming"""
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
        
        try:
            chain = AIAgentService._get_chain(
                conversation_id,
                embedding_provider,
                llm_provider,
                llm_model
            )
            
            # Run chain with streaming
            async for chunk in chain.astream({"question": question}):
                if "answer" in chunk:
                    yield chunk["answer"]
        except Exception as e:
            logger.error(f"Error streaming from AI agent: {e}")
            raise

