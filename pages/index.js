import dynamic from 'next/dynamic'
import Head from 'next/head'

const TouchAI = dynamic(() => import('../components/TouchAI'), { ssr: false })

export default function Home() {
  return (
    <>
      <Head>
        <title>TouchAI Preview</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main>
        <TouchAI />
      </main>
    </>
  )
}
