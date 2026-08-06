import fetch from 'node-fetch';
async function run() {
  const res = await fetch('http://localhost:3000/api/v1/question-papers/223/download');
  console.log(res.status);
  console.log(await res.text());
}
run();
