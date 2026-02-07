"use client"
import dynamic from 'next/dynamic'

const NewPostEditor = dynamic(() => import('../Components/NewPostEditor'), {
  ssr: false,
})

export default function NewPostPage() {
  return <NewPostEditor />
}