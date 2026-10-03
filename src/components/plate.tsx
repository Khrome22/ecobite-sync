export function Plate({ id }: { id: string }) {
  return (
    <div className="mx-auto grid size-40 place-items-center rounded-full bg-[#eaf5f6] shadow-[inset_0_0_0_10px_#f3eee3] lg:size-52 dark:bg-[#1e3338] dark:shadow-[inset_0_0_0_10px_#162226]" aria-hidden>
      {id === "shakshuka" && (
        <div className="relative size-28 rounded-full bg-[#c4452d] lg:size-36">
          <span className="absolute top-5 left-5 size-8 rounded-full bg-[#f4e7c8]" />
          <span className="absolute right-6 bottom-6 size-8 rounded-full bg-[#f7edd4]" />
          <span className="absolute top-6 left-7 size-3 rounded-full bg-[#f2c14e]" />
          <span className="absolute right-8 bottom-8 size-3 rounded-full bg-[#f2c14e]" />
          <span className="absolute top-3 right-6 size-2 rounded-full bg-[#d6f07a]" />
          <span className="absolute bottom-4 left-8 size-2 rounded-full bg-[#d6f07a]" />
          <span className="absolute top-10 right-4 size-1.5 rounded-full bg-[#f3efe4]" />
        </div>
      )}
      {id === "spinach-toast" && (
        <div className="relative h-16 w-28 rotate-[-8deg] rounded-lg bg-[#e2c39a] lg:h-20 lg:w-36">
          <div className="absolute inset-x-3 top-3 h-4 rounded-full bg-[#f4f0e4]" />
          <div className="absolute inset-x-4 top-6 h-6 rounded-md bg-[#3f6b45]" />
        </div>
      )}
      {id === "fried-rice" && (
        <div className="relative size-28 rounded-full bg-[#e6d3a1] lg:size-36">
          <span className="absolute top-6 left-6 size-3 rounded-sm bg-[#f0e28a]" />
          <span className="absolute top-10 right-8 size-3 rounded-sm bg-[#f0e28a]" />
          <span className="absolute bottom-8 left-10 size-2.5 rounded-sm bg-[#d15a3a]" />
          <span className="absolute right-6 bottom-10 size-2 rounded-full bg-[#6ea35a]" />
          <span className="absolute top-8 right-10 size-2 rounded-full bg-[#6ea35a]" />
        </div>
      )}
      {id === "banana-mug" && (
        <div className="relative h-24 w-20 rounded-b-3xl rounded-t-lg bg-[#f3efe4]">
          <div className="absolute inset-x-2 top-2 h-8 rounded-full bg-[#f7f1df]" />
          <div className="absolute top-4 left-3 h-3 w-6 rounded-full bg-[#f0d36a]" />
          <div className="absolute top-5 right-3 h-3 w-5 rounded-full bg-[#e2b84a]" />
          <div className="absolute top-6 -right-3 h-6 w-4 rounded-r-full border-4 border-[#f3efe4]" />
        </div>
      )}
      {id === "skillet-chicken" && (
        <div className="relative size-28 rounded-full bg-[#8d2f24] lg:size-36">
          <span className="absolute top-6 left-5 h-6 w-12 rounded-full bg-[#d7a06a]" />
          <span className="absolute right-5 bottom-7 h-6 w-12 rounded-full bg-[#c48958]" />
          <span className="absolute bottom-5 left-8 size-3 rounded-full bg-[#8fbf62]" />
        </div>
      )}
      {id === "avocado-toast" && (
        <div className="relative h-16 w-28 rotate-3 rounded-lg bg-[#e7c8a1] lg:h-20 lg:w-36">
          <div className="absolute inset-2 rounded-md bg-[#6a8f4e]" />
          <div className="absolute top-4 left-6 size-6 rounded-full bg-[#d7e2a4]" />
        </div>
      )}
      {id === "pepper-eggs" && (
        <div className="relative size-28 rounded-full bg-[#f2d56b] lg:size-36">
          <span className="absolute top-6 left-6 h-4 w-8 rounded-full bg-[#c4452d]" />
          <span className="absolute right-6 bottom-8 h-3 w-7 rounded-full bg-[#3f6b45]" />
          <span className="absolute top-12 left-10 size-3 rounded-full bg-[#f7edd4]" />
        </div>
      )}
      {id === "yogurt-bowl" && (
        <div className="relative size-28 rounded-full bg-[#f7f1df] lg:size-36">
          <span className="absolute top-8 left-8 size-4 rounded-full bg-[#6b3a8c]" />
          <span className="absolute top-10 right-8 size-3 rounded-full bg-[#c4452d]" />
          <span className="absolute bottom-8 left-12 size-3 rounded-full bg-[#f0d36a]" />
        </div>
      )}
      {id === "tomato-feta" && (
        <div className="relative size-28 rounded-full bg-[#c4452d] lg:size-36">
          <span className="absolute top-7 left-7 size-6 rounded-md bg-[#f7f1df]" />
          <span className="absolute right-7 bottom-8 size-5 rounded-md bg-[#f4e7c8]" />
          <span className="absolute top-6 right-8 size-2 rounded-full bg-[#6ea35a]" />
        </div>
      )}
      {id === "cilantro-rice" && (
        <div className="relative size-28 rounded-full bg-[#e6d3a1] lg:size-36">
          <span className="absolute top-6 left-8 size-2 rounded-full bg-[#3f6b45]" />
          <span className="absolute top-10 right-7 size-2 rounded-full bg-[#6ea35a]" />
          <span className="absolute bottom-8 left-10 size-2 rounded-full bg-[#3f6b45]" />
          <span className="absolute right-10 bottom-10 size-2 rounded-full bg-[#6ea35a]" />
        </div>
      )}
      {id === "banana-toast" && (
        <div className="relative h-16 w-28 rotate-[-4deg] rounded-lg bg-[#e2c39a] lg:h-20 lg:w-36">
          <div className="absolute inset-x-3 top-4 h-6 rounded-full bg-[#f0d36a]" />
        </div>
      )}
      {id === "warm-oat" && (
        <div className="relative h-24 w-20 rounded-b-3xl rounded-t-lg bg-[#f3eee3]">
          <div className="absolute inset-x-2 top-3 h-10 rounded-full bg-[#e6d7bd]" />
          <div className="absolute top-8 -right-3 h-6 w-4 rounded-r-full border-4 border-[#f3eee3]" />
        </div>
      )}
      {id === "broccoli-eggs" && (
        <div className="relative size-28 rounded-full bg-[#f2d56b] lg:size-36">
          <span className="absolute top-5 left-6 size-8 rounded-full bg-[#3f6b45]" />
          <span className="absolute right-5 bottom-6 size-7 rounded-full bg-[#6ea35a]" />
        </div>
      )}
      {id === "potato-skillet" && (
        <div className="relative size-28 rounded-full bg-[#c48958] lg:size-36">
          <span className="absolute top-6 left-6 size-5 rounded-md bg-[#e2b84a]" />
          <span className="absolute top-8 right-7 size-4 rounded-md bg-[#d7a06a]" />
          <span className="absolute bottom-7 left-10 size-5 rounded-md bg-[#f0d36a]" />
        </div>
      )}
    </div>
  )
}
