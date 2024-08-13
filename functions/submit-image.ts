import { Octokit } from 'octokit'
const DOMAIN = "is-meme.pages.dev"

// Converts an ArrayBuffer directly to base64, without any intermediate 'convert to string then
// use window.btoa' step. According to my tests, this appears to be a faster approach:
// http://jsperf.com/encoding-xhr-image-data/5
// https://community.cloudflare.com/t/canonical-way-to-convert-image-arraybuffer-to-base64/392149
/*
MIT LICENSE

Copyright 2011 Jon Leighton

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function base64ArrayBuffer(arrayBuffer) {
  var base64 = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var bytes = new Uint8Array(arrayBuffer)
  var byteLength = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]

    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4 // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2 // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }

  return base64
}

export async function onRequestPost(contex) {
  const octokit = new Octokit({
    auth: contex.env.GITHUB_API_KEY
  })

  async function submitImg(imgProm: Promise<ArrayBuffer>, mimetype: string, send: (txt: string) => Promise<void>) {

    const owner = 'nexus-uw' // TODO REPLACE ME IN FORKS
    const repo = 'is-meme'

    const master = await octokit.rest.git.getRef({
      owner, repo,
      ref: 'heads/master'
    })

    const id = (new Date()).valueOf()

    const branch = `test${id}`
    await octokit.rest.git.createRef({
      owner, repo,
      ref: `refs/heads/${branch}`,
      sha: master.data.object.sha
    })
    send(`
         <div slot="content"  class="content">
          <h3>branch created</h3>
        </div>`)

    const path = `client/assets/${id}.${mimetype.split('/')[1]}`
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      content: base64ArrayBuffer(await imgProm),
      message: 'id=' + id,
      branch,
      mediaType: { format: 'base64' },
      committer: {
        name: 'is-meme',
        email: 'bot@is-meme.bot.local'
      }
    })
    send(`
         <div slot="content"  class="content">
          <h3>meme uploaded</h3>
        </div>`)

    await octokit.rest.pulls.create({
      owner,
      repo,
      title: `am-i-a-meme-${Date().valueOf()}`,
      head: branch,
      base: 'master',
      body: `![meme](https://${branch}.${DOMAIN}/${path.replace('client/', '')})`
    })
    send(`
         <div slot="content"  class="content">
          <h3>PR created for review</h3>
        </div>`)

  }

  let { readable, writable } = new TransformStream()
  let writer = writable.getWriter()
  const textEncoder = new TextEncoder()

  contex.waitUntil((async () => {
    const send = (txt: string) => writer.write(textEncoder.encode(txt))

    try {

      send(`
      <!DOCTYPE html>
      <html>

      <head>
        <title>meme submitted for review</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" type="text/css" href="/style.css">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'self';">

      </head>

      <body>
        <template shadowrootmode="open">
          <header>meme submission</header>
          <main>
            <slot name="content">fetching</slot>
          </main>
          <footer><a href="/">GOTO HOME</a></footer>
        </template>
  `)

      const formData: FormData = await contex.request.formData()
      if (formData.has('url') && formData.get('url').length > 0) {
        const url = formData.get('url')
        const res = await fetch(url, {
          headers: {
            'user-agent': "deno fetch v1",
          },
        })
        send(`
         <div slot="content"  class="content">
          <h3>remote meme fetched</h3>
        </div>`)

        await submitImg(res.arrayBuffer(), res.headers.get('Content-Type'), send)
        send(`
         <div slot="content" class="content">
          <h2> you will be ghosted</h2>
        </div>`
        )
      } else if (formData.has('img')) {
        const img = formData.get("img") as unknown as File
        send(`
         <div slot="content"  class="content">
          <h3>submitted meme loaded</h3>
        </div>
      `)
        console.log('img', img, img.name, img.size, img.type)

        await submitImg(img.arrayBuffer(), img.type, send)
        send(`
         <div slot="content"  class="content">
          <h2> you will be ghosted</h2>
        </div>
      `)
      } else {
        return new Response('missing img/url', { status: 400 })
      }

      send(`
  </body>
  </html>
  `)
    } catch (e) {
      console.error(e)
      send(`<h1>SHIT BROKE YO</h1>`)
    }
    finally {
      writer.close()

    }


  })())

  // return Response.redirect('https://am-i-meme.pages.dev/submitted.html')
  return new Response(readable)


}