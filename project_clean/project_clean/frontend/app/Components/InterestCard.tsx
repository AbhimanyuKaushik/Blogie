type InterestCardProps ={
    title: string;
    selected:boolean;
    images:string;
    onClick:()=> void;
};

export default function InterestCard({title,selected,images,onClick}: InterestCardProps){

    return(
        <div onClick={onClick}  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border
        ${selected ? "border-fuchsia-700": "border-gray-200"}
      `}>
        <img src={images} className="absolute inset-0 h-full w-full object-cover"></img>   
        <div className={`absolute inset-0 transition-all duration-300
        ${selected ? "bg-black/10" : "bg-black/40"}
      `}/>
        <div className="relative z-10 flex h-full items-center justify-center">
            <span className="text-lg text-white">{title}</span>
        </div>
        </div>
    )
}