import { adminAuth } from './src/lib/firebase-admin.ts';
async function run() {
  try {
    await adminAuth.verifyIdToken('dummy');
    console.log("Success");
  } catch (e) {
    console.error("Failed:", e.message);
  }
  process.exit();
}
run();
