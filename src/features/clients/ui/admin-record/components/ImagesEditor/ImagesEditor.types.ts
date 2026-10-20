export interface ImagesEditorProps {
  clientId: string
  images: readonly string[]
  imageUrls: Readonly<Record<string, string>>
}
