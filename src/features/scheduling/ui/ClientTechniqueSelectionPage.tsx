import { loadTechniqueSelectionPageData } from './load-technique-selection-page'
import { TechniqueSelectionPageView } from './TechniqueSelectionPageView'

export async function ClientTechniqueSelectionPage() {
  const data = await loadTechniqueSelectionPageData()
  return <TechniqueSelectionPageView data={data} />
}
