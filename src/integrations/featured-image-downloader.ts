import type { AstroIntegration } from 'astro'
import { getAllPosts, downloadFile } from '../lib/notion/client'

const downloadFeaturedImages = async () => {
  const posts = await getAllPosts()

  await Promise.all(
    posts.map((post) => {
      if (
        !post.RepresentativeImage ||
        !post.RepresentativeImage.Url ||
        post.RepresentativeImage.Type !== 'file'
      ) {
        return Promise.resolve()
      }

      let url!: URL
      try {
        url = new URL(post.RepresentativeImage.Url)
      } catch {
        console.log('Invalid representative image URL')
        return Promise.resolve()
      }

      return downloadFile(url)
    })
  )
}

export default (): AstroIntegration => ({
  name: 'featured-image-downloader',
  hooks: {
    'astro:build:start': downloadFeaturedImages,
    'astro:server:setup': downloadFeaturedImages,
  },
})
