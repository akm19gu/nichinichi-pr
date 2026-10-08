import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {graphql} from './buffer.mjs';
const live = process.argv.includes('--publish');
const day = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());
const root = live ? 'posts' : 'preview';
const folder = `${root}/${day}`;
const stateFile = `${folder}/state.json`;
const git = (...args) => execFileSync('git',args,{stdio:'pipe'}).toString().trim();
async function saveState(s) { await fs.writeFile(stateFile,JSON.stringify(s,null,2)+'\n'); }
function persist(message) {
  git('add','posts'); git('commit','-m',message); git('push','origin','HEAD');
}
if (live) {
  for (const key of ['BUFFER_API_KEY','BUFFER_CHANNEL_ID','GITHUB_REPOSITORY'])
    if (!process.env[key]) throw new Error(`${key} is required`);
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Publish only through the configured GitHub workflow');
  try { await fs.access(stateFile); console.log('Already submitted or awaiting manual verification. Skipping:',day); process.exit(0); }
  catch(e) {if(e.code !== 'ENOENT') throw e;}
  const channel = (await graphql(`query { channel(input: {id:${JSON.stringify(process.env.BUFFER_CHANNEL_ID)}}) {id service isQueuePaused} }`)).channel;
  if (!channel || !['twitter','x'].includes(channel.service.toLowerCase()) || channel.isQueuePaused)
    throw new Error('Check that BUFFER_CHANNEL_ID selects an active, unpaused X channel');
}
await fs.mkdir(folder,{recursive:true});
const browser = await chromium.launch();
let term;
try {
  const page = await browser.newPage({viewport:{width:720,height:1100},deviceScaleFactor:2,timezoneId:'Asia/Tokyo',locale:'ja-JP',colorScheme:'light',reducedMotion:'reduce'});
  await page.goto('https://nichinichikoregengaku.akm7339gil.workers.dev/#today',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(() => ['term','gist','story','lens','flex'].every(id => document.getElementById(id)?.textContent.trim()));
  await page.evaluate(() => document.fonts.ready);
  term = (await page.locator('#term').innerText()).replace(/\s+/g,'').trim();
  if (!term) throw new Error('Missing title');
  const shownDay = await page.locator('#day-date').innerText();
  await page.addStyleTag({content: '.tabbar { visibility: hidden !important; }'});
  await page.locator('#card').screenshot({path:`${folder}/column.png`});
  await fs.writeFile(`${folder}/post.json`,JSON.stringify({date:day,shownDay,term,text:`きょうの衒学　${term}`},null,2)+'\n');
} finally { await browser.close(); }
const text = `きょうの衒学　${term}`;
console.log(text,`${folder}/column.png`);
if (!live) process.exit(0);
// Publish the image first. Raw URLs address the immutable commit, avoiding cached old images.
persist(`Prepare column image ${day}`);
const sha = git('rev-parse','HEAD');
const url = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${sha}/${folder}/column.png`;
const check = await fetch(url,{signal:AbortSignal.timeout(30000)});
if (!check.ok || !check.headers.get('content-type')?.startsWith('image/')) throw new Error('Image URL is not public');
// Persist a claim before creating a Buffer post: ambiguous API failures must never auto-resubmit.
await saveState({date:day,status:'submitting',imageUrl:url});
persist(`Claim daily post ${day}`);
try {
  const dueAt = new Date(Date.now()+5*60000).toISOString();
  const query = `mutation { createPost(input: {text:${JSON.stringify(text)},channelId:${JSON.stringify(process.env.BUFFER_CHANNEL_ID)},schedulingType:automatic,mode:customScheduled,dueAt:${JSON.stringify(dueAt)},assets:[{image:{url:${JSON.stringify(url)}}}]}) { ... on PostActionSuccess {post {id dueAt}} ... on MutationError {message} } }`;
  const result = (await graphql(query)).createPost;
  if (!result?.post?.id) throw new Error(result?.message || 'No post ID returned');
  await saveState({date:day,status:'scheduled',postId:result.post.id,dueAt:result.post.dueAt,imageUrl:url});
  persist(`Record Buffer post ${day}`);
  console.log('Scheduled in Buffer:',result.post.id);
} catch(e) {
  console.error('Submission needs manual verification in Buffer. Do not delete state until checking the queue.');
  throw e;
}
