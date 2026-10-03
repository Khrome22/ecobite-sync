"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Category } from "@/lib/kitchen"
import { useKitchen } from "@/lib/store"

const CATEGORIES: Category[] = ["produce", "dairy", "protein", "grain", "other"]

export function AddIngredientDialog() {
  const { addDrafts } = useKitchen()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [grams, setGrams] = useState("150")
  const [hours, setHours] = useState("24")
  const [price, setPrice] = useState("2.00")
  const [category, setCategory] = useState<Category>("produce")

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const cleanName = name.trim()
    const parsedGrams = Number(grams)
    const parsedHours = Number(hours)
    const parsedPrice = Number(price)
    if (!cleanName || !Number.isFinite(parsedGrams) || parsedGrams <= 0 || !Number.isFinite(parsedHours) || parsedHours <= 0) {
      return
    }
    addDrafts([
      {
        name: cleanName,
        quantityLabel: quantity.trim() || `${Math.round(parsedGrams)} g`,
        grams: parsedGrams,
        category,
        priceUsd: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
        hoursToExpire: parsedHours,
        source: "manual",
      },
    ])
    setName("")
    setQuantity("")
    setOpen(false)
  }

  return (
    <>
      <Button variant="outline" className="h-10" onClick={() => setOpen(true)}>
        Log something
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log an ingredient</DialogTitle>
            <DialogDescription>No photo needed. A name and a clock is enough.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ing-name">Name</Label>
              <Input id="ing-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Half a cucumber" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ing-qty">Quantity</Label>
                <Input id="ing-qty" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="1" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ing-grams">Grams</Label>
                <Input id="ing-grams" inputMode="decimal" value={grams} onChange={(event) => setGrams(event.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ing-hours">Hours left</Label>
                <Input id="ing-hours" inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value)} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ing-price">Price, USD</Label>
                <Input id="ing-price" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ing-cat">Category</Label>
              <select
                id="ing-cat"
                value={category}
                onChange={(event) => setCategory(event.target.value as Category)}
                className="h-10 rounded-lg border border-input bg-input/30 px-2.5 text-sm"
              >
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" className="h-10">
                Start the clock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
