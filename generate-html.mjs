import { urlencoded } from 'express'
import { readdir, writeFile } from 'fs/promises'

const DOMAIN = 'is-meme.pages.dev' // todo make param

const files = (await readdir('./client/assets')).reverse()


console.log(files)

const pageSize = 15


let page = 1
let imgs = []
function writePage(imgs, page) {
  writeFile(page == 1 ? `./client/index.html` : `./client/page${page}.html`, `<html>
    <head>
      <title>MEME? page=${page}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <link  rel="stylesheet" type="text/css"  href="/style.css">

      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'self' 'unsafe-inline'; manifest-src 'self';">
      <link rel="alternate" type="application/rss+xml" title="am-i-meme feed" href="/feed.xml">
      <link rel="manifest" href="/manifest.json">
    </head>
    <body>
    <h1>These are confirmed memes</h1>
    <div><a href="./submit">submit new meme for review</a></div>
    ${imgs.map((img, index) => `<div>
      <img src="./assets/${img}"
      style="object-fit: contain; object-fit: contain; max-heigh:500px;max-width: 500px;"
      fetchpriority="${index > 3 ? 'low' : 'high'}"
      loading="${index > 3 ? 'lazy' : 'eager'}">
    </div>`).join('')}

    ${page <= 1 ? '' : ` <a href="./page${page + 1}.html">prev</a>`}
    <br/>

    ${imgs.length !== pageSize ? '' : ` <a href="./page${page + 1}.html">next</a>`}

    <footer>
    If you have submitted a meme, and it is not showing up, then you failed to submit a meme. No further information can be provided and we thank you for your failed submission, and hope you never return.
    <div><a href="http://validator.w3.org/feed/check.cgi?url=https%3A//${DOMAIN}/feed.xml"><img src="valid-rss-rogers.png" alt="[Valid RSS]" title="Validate my RSS feed" /></a>
    </div>
    <div><a href="https://github.com/nexus-uw/is-meme">CODE</a>
    </div>
    </footer>
    </body>
    </html>`)

  if (page === 1) {
    writeFile('./client/feed.xml', `
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>is-meme</title>
        <link>https://${DOMAIN}</link>
        <atom:link href="https://${DOMAIN}/feed.xml" rel="self" type="application/rss+xml"/>
        <description>confirmed memes</description>
        <language>en-us</language>
        <pubDate>${(new Date()).toUTCString()}</pubDate>
        <lastBuildDate>${(new Date()).toUTCString()}</lastBuildDate>
        <generator>dez nutz</generator>
        ${imgs.map(img => `
        <item>
          <title>${img}</title>
          <link>https://${DOMAIN}/assets/${img}</link>
          <description><![CDATA[<img alt="meme" src="https://${DOMAIN}/assets/${img}">]]>
          </description>
          <guid isPermaLink="false">${img.split('.')[0]}</guid>
        </item>`).join('')}
      </channel>
    </rss>
    `)
  }
}

for (let i = 0; i < files.length; i++) {
  if (i % pageSize === 0 && i > 1) {
    writePage(imgs, page)
    imgs = []
    page++

  }

  imgs.push(files[i])

}

if (imgs.length > 0) {
  writePage(imgs, page)
}
