import { graphql } from './buffer.mjs';
const data = await graphql('query { account { organizations { id name } } }');
for (const org of data.account.organizations) {
  const d = await graphql(`query { channels(input: {organizationId:${JSON.stringify(org.id)}}) {id name displayName service isQueuePaused} }`);
  console.log(JSON.stringify({organization:org,channels:d.channels},null,2));
}
