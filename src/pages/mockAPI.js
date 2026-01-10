// src/mockApi.js - Now fetches from Firestore
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';

export const mockApi = {
  getProducts: async () => {
    try {
      const productsRef = collection(db, 'products');
      const snapshot = await getDocs(productsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },
  
  getProductById: async (id) => {
    try {
      // First try to get by document ID
      const docRef = doc(db, 'products', String(id));
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      
      // If not found, try querying by numeric id field
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('id', '==', Number(id)));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      return null;
    }
  },
  
  getProductsByCategory: async (category) => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('category', '==', category));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }
  },
  
  updateProduct: async (id, updates) => {
    try {
      const docRef = doc(db, 'products', String(id));
      await updateDoc(docRef, updates);
      const updatedDoc = await getDoc(docRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      console.error('Error updating product:', error);
      return null;
    }
  },
};