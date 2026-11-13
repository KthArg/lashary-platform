import { useEffect, useRef, useState, type ChangeEvent } from 'react'

export function useChosenImagePreview() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [chosenUrl, setChosenUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (chosenUrl) URL.revokeObjectURL(chosenUrl)
    }
  }, [chosenUrl])

  useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return
    const clearChosen = () => setChosenUrl(null)
    form.addEventListener('reset', clearChosen)
    return () => form.removeEventListener('reset', clearChosen)
  }, [])

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    setChosenUrl(file ? URL.createObjectURL(file) : null)
  }

  return { inputRef, chosenUrl, chooseImage }
}
