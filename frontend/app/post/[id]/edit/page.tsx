"use client"
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'

const NewPostEditor = dynamic(() => import('../../../Components/NewPostEditor'), {
  ssr: false,
})

export default function EditPostPage() {
  const params = useParams()
  const postId = params.id as string

  return <NewPostEditor initialPostId={postId} />
