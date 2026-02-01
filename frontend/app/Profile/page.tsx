"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'

type ProfileForm={
  name:string,
  age:string,
  bio:string,
  location:string,
  interests:string[],
  profileImage?:string,
  social:{
    instagram: string,
      twitter: string,
      linkedin: string,
  }
}

export default function ProfilePage() {
    const router = useRouter();
    const [form,setForm] = useState<ProfileForm>({
    name:"",
    age: "",
    bio: "",
    location: "",
    interests: [],
    profileImage:"",
    social: {
      instagram: "",
      twitter: "",
      linkedin: "",
    },
  });

  const[loading,setLoading] = useState(true);
  useEffect(() =>{
    const fetchProfile = async() => {
      try {
        const res = await fetch("http://localhost:5000/api/profile/me",{
          credentials:"include",
        });
        const data = await res.json();
        console.log(data)
        setForm({
          name:data.profile.username,
          age:data.profile.age,
          bio:data.profile.bio,
          location:data.profile.location,
          interests:data.profile.interests||[],
          profileImage:data.profile.profileImage,
          social:{
            instagram:data.profile.social?.instagram,
            twitter: data.profile.social?.twitter,
            linkedin: data.profile.social?.linkedin,
          },
        });
      }catch(error){
        console.error("Failed to fetch profile",error);
      }finally{
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);


  const defaultImage="https://plus.unsplash.com/premium_photo-1677252438425-e4125f74fbbe?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  const [image,setImage] = useState<string>(defaultImage)

  const imageChange = async (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const formData = new FormData();
    formData.append("image",file);
    try{
      const res=await fetch("http://localhost:5000/api/profile/upload-profile-image",
      {
        method:"PATCH",
        credentials:"include",
        body:formData,
      }
    );
    const data = await res.json();
    setForm((prev) => ({
      ...prev,
      profileImage:data.profileImage,
    }));
    }catch(error){
      console.error("Image Upload failed",error);
    }
  };

  if(loading){
    return <div className='p-6 text-gray-600 text-center'>Loading profile...</div>
  }
  return (
    <div className='h-screen w-auto'>
      <div className='flex justify-center items-center mt-6 '>
        <img 
        src={form.profileImage||defaultImage}
        className='w-44 h-44 rounded-full object-cover border'/>
        <input
        type='file'
        accept='image/png,image/jpeg'
        onChange={imageChange}
        className='hidden'/>
        
      </div>
      <div className='text-center mt-4'>
        <h2>{form.name||"User"}</h2>
      </div>
      <div className='bg-black/10 h-screen w-auto rounded-2xl mt-2'>
        <div className='p-6'>
          <h2 className='text-lg font-semibold mb-2'>Age</h2>
          <div className='text-sm text-gray-500'>{form.age}</div>
        </div>
        <div className="p-6 border-t">
          <h3 className="text-lg font-semibold text-black mb-2">About</h3>
          <p className="text-gray-500 text-sm">
            {form.bio || "No bio added yet."}
          </p>
        </div>
        <div className='p-6 border-t'>
          <h3 className='text-lg font-semibold text-black mb-2'>Interests</h3>
          <div className=''>
            {form.interests.length > 0 ? (
              form.interests.map((interest) =>(
                <span key={interest} className='px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full'>{interest}</span>
              ))
            ):(<p className='text-gray-500 text-sm'>No interests selected.</p>)}
          </div>
        </div>
        <div className='p-6 border-t'>
          <h3 className='text-lg font-semibold text-black mb-3'>Social</h3>
          <div>{form.social.instagram && (
            <a href={form.social.instagram} target='_blank'>Instagram</a>
          )}
          {form.social.twitter && (
            <a href={form.social.twitter} target='_blank'>Twitter</a>
          )}
          {form.social.linkedin &&(
            <a href={form.social.linkedin} target='_blank'>LinkedIn</a>
          )}
           {!form.social.instagram &&
            !form.social.twitter &&
            !form.social.linkedin && (
              <p className="text-gray-500 text-sm">
                No social links added.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
