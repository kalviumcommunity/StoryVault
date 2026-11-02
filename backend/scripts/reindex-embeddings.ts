import { prisma } from '../src/lib/prisma';
import { aiProvider } from '../src/services/aiProvider';

async function main() {
  const chunks = await prisma.documentChunk.findMany({
    select: {
      id: true,
      content: true,
      document: { select: { title: true } },
    },
    orderBy: [{ documentId: 'asc' }, { chunkIndex: 'asc' }],
  });

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    const embedding = await aiProvider.getEmbedding(chunk.content, 'document', chunk.document.title);
    await prisma.documentChunk.update({
      where: { id: chunk.id },
      data: { embedding },
    });

    if ((index + 1) % 25 === 0 || index + 1 === chunks.length) {
      console.log(`Reindexed ${index + 1}/${chunks.length} archive chunks.`);
    }
  }

  if (chunks.length === 0) console.log('No archive chunks require reindexing.');
}

main()
  .catch((error: unknown) => {
    console.error(
      'Gemini embedding reindex failed. Previously saved chunks remain intact; rerun the command after resolving the error.'
    );
    if (error instanceof Error) console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
