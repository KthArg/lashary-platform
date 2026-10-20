export interface ImageViewerProps {
  url: string
  alt: string
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
}
