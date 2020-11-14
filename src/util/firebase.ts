import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({});
}
const db = admin.firestore();
const quotesRef = db.collection("quotes");
const booksRef = db.collection("books");
export { db, quotesRef, booksRef };
