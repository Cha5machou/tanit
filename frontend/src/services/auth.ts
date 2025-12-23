import {
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

const googleProvider = new GoogleAuthProvider()
const facebookProvider = new FacebookAuthProvider()

export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error) {
    console.error('Error signing in with Google:', error)
    throw error
  }
}

export const signInWithFacebook = async (): Promise<FirebaseUser> => {
  try {
    const result = await signInWithPopup(auth, facebookProvider)
    return result.user
  } catch (error) {
    console.error('Error signing in with Facebook:', error)
    throw error
  }
}

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

export const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

