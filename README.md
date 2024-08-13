# is-meme

silly low code project that lets people submit a meme for review (creates a PR for repo owner to merge/reject). if pr is accepted, the new image is built into the site and it is reployed on cloudflare workers

### things of note
this project has no clientside JS

the file submission uses html streaming + templates to show real time progress of submitting a meme for review (this works on most browsers, but android firefox waits till the stream completes before rendering the page

memes can also be submitted using PWA share targets on Android if the site is installed on the device

## setup
1. fork repo
2. deploy *template* branch (it will contain the code, but no memes from others. so syncing back should be clean and easy) to cloudflare workers
  2.1
  2.2 set DOMAIN + GITHUB_API_KEY envars
