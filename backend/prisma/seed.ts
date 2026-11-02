import { PrismaClient, Role, DocumentType, AccessLevel, DocumentStatus, EntityType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { aiProvider } from '../src/services/aiProvider';

const prisma = new PrismaClient();

function chunkText(text: string, chunkSize = 800, overlap = 150) {
  const chunks: Array<{ content: string; start: number; end: number }> = [];
  const clean = text.replace(/\r\n/g, '\n');
  let start = 0;

  while (start < clean.length) {
    let end = start + chunkSize;
    if (end >= clean.length) {
      chunks.push({ content: clean.slice(start).trim(), start, end: clean.length });
      break;
    }
    const lookback = clean.slice(start, end);
    const splitPoint = lookback.lastIndexOf('. ') > chunkSize * 0.5 ? start + lookback.lastIndexOf('. ') + 2 : end;
    chunks.push({ content: clean.slice(start, splitPoint).trim(), start, end: splitPoint });
    start = splitPoint - overlap;
  }
  return chunks;
}

async function main() {
  console.log('Seeding StoryVault database with realistic fictional archival records...');

  // 1. Clean existing records
  await prisma.researchBriefCitation.deleteMany();
  await prisma.researchBrief.deleteMany();
  await prisma.collectionDocument.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.documentEntity.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.documentChunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.author.deleteMany();
  await prisma.publication.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ingestionJob.deleteMany();
  await prisma.auditLog.deleteMany();

  // 2. Create Seed Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'journalist@storyvault.news',
        passwordHash,
        name: 'Rachel Vance',
        role: Role.JOURNALIST,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
    }),
    prisma.user.create({
      data: {
        email: 'editor@storyvault.news',
        passwordHash,
        name: 'Jonathan Miller',
        role: Role.EDITOR,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
    }),
    prisma.user.create({
      data: {
        email: 'archivist@storyvault.news',
        passwordHash,
        name: 'Clara Oswald-Thorne',
        role: Role.ARCHIVIST,
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      },
    }),
    prisma.user.create({
      data: {
        email: 'admin@storyvault.news',
        passwordHash,
        name: 'Alexander Sterling',
        role: Role.ADMIN,
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      },
    }),
  ]);

  const [journalistUser, editorUser, archivistUser, adminUser] = users;

  // 3. Create Publications
  const publications = await Promise.all([
    prisma.publication.create({
      data: {
        name: 'The National Ledger',
        type: 'Daily Newspaper',
        country: 'United States',
        description: 'Prestigious national daily publication founded in 1912 known for political investigative reporting.',
      },
    }),
    prisma.publication.create({
      data: {
        name: 'Metropolitan Investigative Journal',
        type: 'Monthly Periodical',
        country: 'United States',
        description: 'In-depth longform journal focusing on corporate malfeasance, municipal fraud, and legal accountability.',
      },
    }),
    prisma.publication.create({
      data: {
        name: 'Chronicle Science & Tech Desk',
        type: 'Weekly Digest',
        country: 'United Kingdom',
        description: 'Technical journalism monitoring aerospace, environmental ecology, and computational advancements.',
      },
    }),
    prisma.publication.create({
      data: {
        name: 'Declassified Archives Gazette',
        type: 'Archival Quarterly',
        country: 'Switzerland',
        description: 'Specialist forum transcribing and publishing declassified diplomatic dispatches and historic trial memos.',
      },
    }),
  ]);

  // 4. Create Authors
  const authors = await Promise.all([
    prisma.author.create({
      data: {
        name: 'Elena Vance',
        title: 'Senior Investigative Correspondent',
        organization: 'The National Ledger',
        bio: 'Pulitzer-winning investigative journalist specializing in regulatory oversight and antitrust litigation.',
      },
    }),
    prisma.author.create({
      data: {
        name: 'Marcus Thorne',
        title: 'Special Projects Editor',
        organization: 'Metropolitan Investigative Journal',
        bio: 'Decade-long investigative reporter focusing on industrial environmental crimes and groundwater contamination.',
      },
    }),
    prisma.author.create({
      data: {
        name: 'Sarah Jenkins',
        title: 'Aerospace & Defense Reporter',
        organization: 'Chronicle Science & Tech Desk',
        bio: 'Specialist correspondent with engineering background covering launch vehicle failures and telecom networks.',
      },
    }),
    prisma.author.create({
      data: {
        name: 'Arch-Chronicler Valen Thorne',
        title: 'Chief Archival Historian',
        organization: 'Declassified Archives Gazette',
        bio: 'Curator of early subterranean lore, manuscript preservation systems, and acoustic recording history.',
      },
    }),
    prisma.author.create({
      data: {
        name: 'David K. O’Reilly',
        title: 'Financial Forensics Lead',
        organization: 'Metropolitan Investigative Journal',
        bio: 'Former regulatory analyst uncovering algorithmic manipulation and offshore shell vehicles.',
      },
    }),
  ]);

  // 5. Create Topics
  const topics = await Promise.all([
    prisma.topic.create({ data: { name: 'Antitrust & Cartels', slug: 'antitrust-cartels', description: 'Monopoly practices and price fixing' } }),
    prisma.topic.create({ data: { name: 'Environmental Coverups', slug: 'environmental-coverups', description: 'Industrial pollution, chemical dumping, groundwater leaching' } }),
    prisma.topic.create({ data: { name: 'Aerospace & Telemetry', slug: 'aerospace-telemetry', description: 'Satellite launches, avionics anomalies, mission dispatches' } }),
    prisma.topic.create({ data: { name: 'Political Surveillance', slug: 'political-surveillance', description: 'Wiretaps, leak memos, campaign espionage' } }),
    prisma.topic.create({ data: { name: 'Financial Forensics', slug: 'financial-forensics', description: 'High-frequency trading, market crashes, fraudulent audits' } }),
    prisma.topic.create({ data: { name: 'Archival Heritage & Lore', slug: 'archival-heritage', description: 'Preserved manuscripts, resonant monoliths, library defense' } }),
  ]);

  // 6. Create Entities
  const entities = await Promise.all([
    prisma.entity.create({ data: { name: 'Apex Petrochemical', entityType: EntityType.ORGANIZATION, description: 'Multinational petrochemical conglomerate subject to 1986 deep-well litigation.', mentionsCount: 14 } }),
    prisma.entity.create({ data: { name: 'Federal Trade Commission', entityType: EntityType.ORGANIZATION, description: 'Federal regulatory commission overseeing antitrust compliance.', mentionsCount: 12 } }),
    prisma.entity.create({ data: { name: 'Dr. Aris Vance', entityType: EntityType.PERSON, description: 'Chief hydrologist turned whistleblower regarding aquifer contamination.', mentionsCount: 18 } }),
    prisma.entity.create({ data: { name: 'Senator Robert Sterling', entityType: EntityType.PERSON, description: 'Key senate committee chairman involved in the Silvergate inquiry.', mentionsCount: 9 } }),
    prisma.entity.create({ data: { name: 'Project Helios', entityType: EntityType.EVENT, description: 'Classified commercial-governmental orbital communications launch.', mentionsCount: 11 } }),
    prisma.entity.create({ data: { name: 'The Whispering Vault', entityType: EntityType.LOCATION, description: 'Ancient subterranean crystalline acoustic sanctuary in Aethelgard.', mentionsCount: 8 } }),
    prisma.entity.create({ data: { name: 'Aegis Defense Systems', entityType: EntityType.ORGANIZATION, description: 'Defense contractor subcontracted for orbital payload valves.', mentionsCount: 6 } }),
    prisma.entity.create({ data: { name: 'Silvergate Complex', entityType: EntityType.LOCATION, description: 'Hotel and commercial complex where unauthorized listening posts were uncovered in 1974.', mentionsCount: 10 } }),
  ]);

  // 7. Seed Archival Documents
  const documentsSeedData = [
    {
      title: 'The Silvergate Tapes: Classified Audio Logs Reveal Coordinated Surveillance of Rival Campaign Headquarters',
      content: `WASHINGTON — Internal memoranda dated November 14, 1974, declassified under special legislative review, substantiate that security personnel operating from the Silvergate Complex established clandestine wiretap stations targeting opposition campaign strategy suites.

Transcripts verified by the Senate Select Oversight Committee confirm that over seventy hours of telephone conversations between key aides and Senator Robert Sterling were recorded without judicial authorization. The operation utilized custom magnetic spool recorders concealed inside air distribution ducts on the eighth floor.

When questioned during executive session, Deputy Director Harold Vance asserted under oath that the listening posts were installed as part of a national security vulnerability assessment. However, handwritten marginalia authored by committee legal counsel note: "No executive directive exists authorizing intercept equipment within commercial office suites. This represents an unambiguous breach of Title III wiretap statutes."

The declassified dossier includes physical evidence logs containing forty-two magnetic tapes, technician equipment requisitions, and hotel register sheets verifying continuous room occupancy by operative code-named 'Specter'.`,
      documentType: DocumentType.LEAK_MEMO,
      accessLevel: AccessLevel.RESTRICTED,
      publicationDate: new Date('1974-11-14'),
      authorIndex: 0, // Elena Vance
      publicationIndex: 0, // The National Ledger
      topicIndices: [3], // Political Surveillance
      entityIndices: [3, 7], // Senator Sterling, Silvergate
      provenance: 'Declassified Senate Record Group 46, Box 112, Folder 4 (Microfilm Roll 9). Preserved in StoryVault.',
    },
    {
      title: 'Apex Petrochemical Deep-Well Injection Scandal: Internal Memos Show Aquifer Leaching Known Since 1982',
      content: `BATON ROUGE — A four-month investigation by the Metropolitan Investigative Journal has uncovered confidential geological survey audits proving that executives at Apex Petrochemical were alerted in writing four years before state regulators discovered carcinogenic solvents in the parish drinking water aquifer.

In August 1982, senior geochemist Dr. Aris Vance submitted a 48-page technical evaluation warning that disposal well No. 4 suffered cement casing micro-fractures at the 3,200-foot level. Rather than halting operations or notifying the Department of Environmental Quality, internal board minutes show management reallocated capital expenditures away from well maintenance toward legal defense contingency funds.

"To record chemical concentrations in internal memos is a legal liability; to dilute the monitoring reports is prudence," wrote chief operating officer Victor Cross in an internal strategy memo dated September 1983.

Water sampling conducted by independent university laboratories in October 1986 registered benzene and trichloroethylene concentrations exceeding federal safety thresholds by a factor of four hundred. Over twelve thousand residents in the surrounding parish relied exclusively on municipal wellheads connected directly to the contaminated aquifer layer.`,
      documentType: DocumentType.ARTICLE,
      accessLevel: AccessLevel.PUBLIC,
      publicationDate: new Date('1986-10-22'),
      authorIndex: 1, // Marcus Thorne
      publicationIndex: 1, // Metropolitan Investigative Journal
      topicIndices: [1], // Environmental Coverups
      entityIndices: [0, 2], // Apex Petrochemical, Dr. Aris Vance
      provenance: 'Investigative Archives Vault Box 84-C. Retained from original print edition publication files.',
    },
    {
      title: 'Interview Transcript: Dr. Aris Vance on Sub-Surface Well Failures and Corporate Pressure',
      content: `TRANSCRIPT OF RECORDED INTERVIEW
Date: September 18, 2004
Interviewer: Marcus Thorne, Senior Investigative Editor
Subject: Dr. Aris Vance, former Senior Geochemist, Apex Petrochemical

THORNE: Dr. Vance, let us return to the autumn of 1982. When did you first realize the cement casing at Well No. 4 was failing?

VANCE: It was late September. The pressure transducers inside the annular space began fluctuating by more than twelve percent per shift. In deep-well injection, when annular pressure mirrors injection pressure, it indicates a hydraulic breach. The toxic effluent was migrating upward into the permeable limestone formation.

THORNE: You presented those findings directly to Vice President Cross?

VANCE: Yes. On October 4th, I handed him the acoustic logging traces in his office. He reviewed the charts, turned them face down on his blotter, and asked me who else had seen the computer printouts. When I answered that only my junior technician had the log access, he instructed me to delete the backup tapes and transfer the physical binders to corporate archives in Houston.

THORNE: Did you comply?

VANCE: I placed duplicate microfiches in a personal safe-deposit box that evening. Had I not kept those duplicates, the subsequent federal grand jury indictment would have been dismissed for lack of contemporaneous documentary evidence. The company argued in court that the casing breach was an unforeseen seismic fracture occurring in 1985, whereas our logs proved it was active and documented in 1982.`,
      documentType: DocumentType.INTERVIEW_TRANSCRIPT,
      accessLevel: AccessLevel.PUBLIC,
      publicationDate: new Date('2004-09-18'),
      authorIndex: 1, // Marcus Thorne
      publicationIndex: 1, // Metropolitan Investigative Journal
      topicIndices: [1], // Environmental Coverups
      entityIndices: [0, 2], // Apex Petrochemical, Dr. Aris Vance
      provenance: 'Audio Tape Cassette Reference MC-04-19. Digitized audio master and synchronized transcript.',
    },
    {
      title: 'Archival Footage Dispatch: Project Helios Orbital Relay Launch Failure and Valve Telemetry Abort',
      content: `CAPE CANAVERAL ARCHIVE LOG — Reel 4, Timecode 01:14:22 through 01:28:45.
Subject: Commercial Space Exploration - Project Helios Launch Vehicle FH-3
Classification: Public Archival Footage Notes

Visual description: 35mm high-speed tracking camera positioned at Pad 39-B perimeter. T-minus 14 seconds: Main engine chill procedure underway. Cryogenic oxygen vapor clouds billow from the umbilical mast.

Timecode 01:16:03: Telemetry audio overlay captures flight director command: "Abort on secondary stage. We have an abnormal differential across oxidizer valve B-12."

Archival notes indicate that Project Helios was billed as the first commercial high-throughput orbital relay designed to establish transatlantic data links between financial centers in London and New York. Following ignition abort, contractor Aegis Defense Systems asserted that the anomaly stemmed from thermal contraction in the valve seat.

However, subsequent investigative reporting by Sarah Jenkins revealed that quality assurance inspectors had flagged stress corrosion cracking in identical valve batches three weeks prior to pad rollout. Aegis management waived the replacement timeline to preserve the satellite launch window before winter meteorological closures.

Footage shows recovery crews venting propellants while safety sirens sound across the cape complex. No injuries were reported, but the payload incurred four hundred million dollars in structural sensor recalibration delays.`,
      documentType: DocumentType.FOOTAGE_NOTE,
      accessLevel: AccessLevel.PUBLIC,
      publicationDate: new Date('1988-06-14'),
      authorIndex: 2, // Sarah Jenkins
      publicationIndex: 2, // Chronicle Science & Tech Desk
      topicIndices: [2], // Aerospace & Telemetry
      entityIndices: [4, 6], // Project Helios, Aegis Defense Systems
      provenance: 'Broadcast Archive Reel 88-FL-02. Digitized from original 1-inch Type C video master.',
    },
    {
      title: 'Federal Trade Commission Antitrust Inquiry into Continental Telecom Consortium Price-Fixing',
      content: `BRUSSELS & NEW YORK — Confidential records subpoenaed by the Federal Trade Commission reveal that five international telecommunication providers entered into secret bandwidth allocation pacts beginning in the spring of 1994.

The cartel, referred to in executive correspondence as the 'Atlantic Working Group', met semiannually in Zurich to fix wholesale fiber-optic transit tariffs and coordinate joint bids for subsea cable landing rights. By dividing the North Atlantic corridor into non-compete zones, the consortium artificially inflated data transfer rates for international news agencies, financial exchanges, and research universities by thirty-eight percent.

Lead investigator Elena Vance obtained encrypted telex exchanges between consortium members where executives explicitly agreed to boycott national transit providers that offered rates below the agreed floor price.

"If the Geneva carrier attempts to undercut our transatlantic floor, we will refuse reciprocal peering in London and Frankfurt," wrote consortium chairman Thomas Sterling in a memo dated March 12, 1996.

The FTC filing seeks civil asset forfeitures and injunctive dissolution of all cooperative operating agreements, marking the most aggressive antitrust enforcement action against telecom monopolies in two decades.`,
      documentType: DocumentType.ARTICLE,
      accessLevel: AccessLevel.PUBLIC,
      publicationDate: new Date('1997-04-12'),
      authorIndex: 0, // Elena Vance
      publicationIndex: 0, // The National Ledger
      topicIndices: [0], // Antitrust & Cartels
      entityIndices: [1], // Federal Trade Commission
      provenance: 'FTC Docket 97-AT-401 Archive Copy. Certified investigative press release archive.',
    },
    {
      title: 'Algorithmic Arbitrage Flash Crash: How High-Frequency Trading Quants Induced the Flash Abort',
      content: `NEW YORK — On May 6, 2010, at 2:42 PM Eastern Standard Time, the Dow Jones Industrial Average plummeted nearly 1,000 points within minutes before rebounding. A joint forensic audit by the Metropolitan Investigative Journal and academic econometrics institutes has reconstructed the exact computational chain reaction.

At the epicenter of the disruption was a proprietary algorithmic strategy executed by offshore fund Quasar Capital. The automated execution bot, programmed to liquidate 75,000 E-mini contracts based on algorithmic feedback loops, flooded dark pools with spoofed sell quotes.

When institutional algorithmic market makers detected the surge in unhedged risk, their automated safety parameters pulled quote liquidity from public exchanges simultaneously. For 180 seconds, major equities traded down to literal pennies per share.

Forensic analyst David K. O’Reilly uncovered that the algorithms utilized sub-millisecond optical interconnects routed directly through telecommunication hubs originally established during the 1990s Atlantic Consortium era. The investigation documents how regulatory authorities lacked the computational infrastructure to inspect real-time algorithmic order books, relying instead on post-hoc trade logs submitted weeks after market dislocation.`,
      documentType: DocumentType.ARTICLE,
      accessLevel: AccessLevel.PUBLIC,
      publicationDate: new Date('2010-05-18'),
      authorIndex: 4, // David K. O'Reilly
      publicationIndex: 1, // Metropolitan Investigative Journal
      topicIndices: [4], // Financial Forensics
      entityIndices: [],
      provenance: 'Financial Engineering Archives Case Study Series 2010-NY. Preserved in StoryVault.',
    },
    {
      title: 'The Vault of Whispering Stones: Archaeological Preservation and Acoustic Resonant Archives',
      content: `Deep beneath the frost-shrouded spires of Aethelgard lay the Whispering Vault, an ancient subterranean sanctuary engineered to preserve civilization foundational narratives. Unlike conventional stone repositories, the vault was lined with resonant obsidian pillars known as the Singing Monoliths. Each pillar possessed the extraordinary capacity to retain the spoken cadence, emotional nuance, and precise vocabulary of whoever addressed it.

For seven centuries, the Order of the Keepers guarded these subterranean corridors against atmospheric degradation and political upheaval. During the Great Northern Siege of the Third Era, when invading forces burned the Grand Citadel Library, the Keepers retreated into the vault fourth sub-level. There, amidst thirty-two subterranean chambers, they transcribed more than four thousand parchment manuscripts into spoken resonance, embedding the entire legal, astronomical, and philosophical canon into the crystalline lattice of the stone.

"To record a story in ink is to gamble with fire and water," wrote High Chronicler Melissa in her final journal entry dated Year 742 of the Common Epoch. "To engrave a story in sound and crystal is to bequeath memory directly to eternity. Whosoever enters this vault with an open mind and steady heart shall hear the voices of the elders speak with clarity untarnished by the passage of millenniums."

Today, StoryVault honors this ancient tradition by employing modern digital indexing, embedding vectors, and retrieval-augmented generation to safeguard human and literary knowledge. Through structured tokenization and semantic synthesis, every story preserved within our vaults remains instantly discoverable, faithfully preserved, and resilient against temporal erasure.`,
      documentType: DocumentType.HISTORICAL_REPORT,
      accessLevel: AccessLevel.PUBLIC,
      publicationDate: new Date('2024-01-15'),
      authorIndex: 3, // Arch-Chronicler Valen Thorne
      publicationIndex: 3, // Declassified Archives Gazette
      topicIndices: [5], // Archival Heritage & Lore
      entityIndices: [5], // The Whispering Vault
      provenance: 'Preserved Lore Corpus Sample. Transcribed from Codex Aethelgardensis.',
    },
    {
      title: 'Classified Whistleblower Dossier: Autonomous Fleet Sensor Drift Retraction and Safety Audits',
      content: `SAN FRANCISCO — A leaked 120-page engineering audit prepared for executive leadership reveals that an autonomous commercial vehicle fleet operating across six metropolitan regions suffered systematic lidar sensor drift during sustained rainstorms, leading to ninety-two undisclosed near-collision incidents over an eighteen-month operating window.

The document, marked "STRICTLY CONFIDENTIAL — ATTORNEY-CLIENT PRIVILEGED", confirms that while engineering teams recommended immediate firmware recalls to recalibrate reflective surface filtering, executive leadership opted to classify the incidents as 'operator anomalies' to avoid federal safety recall mandates and protect impending initial public offering valuations.

Internal email chains show safety directors warning that failure to patch optical firmware risked catastrophic failure at pedestrian intersections. The dossier contains flight recorder telemetry, firmware commit logs, and test track sensor recordings corroborated by three independent former engineering leads.`,
      documentType: DocumentType.LEAK_MEMO,
      accessLevel: AccessLevel.CLASSIFIED,
      publicationDate: new Date('2022-11-08'),
      authorIndex: 2, // Sarah Jenkins
      publicationIndex: 2, // Chronicle Science & Tech Desk
      topicIndices: [2], // Aerospace & Telemetry
      entityIndices: [],
      provenance: 'Whistleblower Submission Vault RG-2022-SF. Accessible exclusively by Administrators.',
    },
  ];

  for (const docData of documentsSeedData) {
    const contentHash = crypto.createHash('sha256').update(docData.content).digest('hex');
    const slugBase = docData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 75);
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const wordCount = docData.content.trim().split(/\s+/).length;
    const summary = docData.content.slice(0, 280).replace(/\s+/g, ' ').trim() + '...';

    const author = authors[docData.authorIndex];
    const publication = publications[docData.publicationIndex];

    const doc = await prisma.document.create({
      data: {
        title: docData.title,
        slug,
        content: docData.content,
        extractedText: docData.content,
        summary,
        documentType: docData.documentType,
        accessLevel: docData.accessLevel,
        status: DocumentStatus.INDEXED,
        publicationDate: docData.publicationDate,
        originalFilename: `${slugBase}.txt`,
        contentHash,
        provenance: docData.provenance,
        wordCount,
        authorId: author.id,
        publicationId: publication.id,
      },
    });

    // Chunk and generate embeddings
    const chunks = chunkText(docData.content);
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const embedding = await aiProvider.getEmbedding(c.content, 'document', docData.title);
      await prisma.documentChunk.create({
        data: {
          documentId: doc.id,
          chunkIndex: i + 1,
          content: c.content,
          startChar: c.start,
          endChar: c.end,
          tokenCount: Math.ceil(c.content.length / 4),
          embedding,
        },
      });
    }

    // Connect topics
    for (const tIdx of docData.topicIndices) {
      const topic = topics[tIdx];
      if (topic) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { topics: { connect: { id: topic.id } } },
        });
      }
    }

    // Connect entities
    for (const eIdx of docData.entityIndices) {
      const entity = entities[eIdx];
      if (entity) {
        await prisma.documentEntity.create({
          data: {
            documentId: doc.id,
            entityId: entity.id,
            relevanceScore: 0.95,
            contextSnippet: doc.summary,
          },
        });
      }
    }
  }

  // 8. Create a Sample Collection & Brief for Journalist
  const firstDoc = await prisma.document.findFirst({ where: { accessLevel: AccessLevel.PUBLIC } });
  const secondDoc = await prisma.document.findFirst({ where: { id: { not: firstDoc?.id }, accessLevel: AccessLevel.PUBLIC } });

  const sampleCollection = await prisma.collection.create({
    data: {
      name: 'Industrial & Environmental Malfeasance',
      description: 'Primary source documents and interviews tracking petrochemical wellhead leaching and aquifer contamination.',
      isPublic: true,
      ownerId: journalistUser.id,
    },
  });

  if (firstDoc) {
    await prisma.collectionDocument.create({
      data: {
        collectionId: sampleCollection.id,
        documentId: firstDoc.id,
        notes: 'Key foundational document showing earliest documented notice.',
      },
    });
  }

  if (secondDoc) {
    await prisma.collectionDocument.create({
      data: {
        collectionId: sampleCollection.id,
        documentId: secondDoc.id,
        notes: 'Corroborating witness testimony from chief geochemist.',
      },
    });
  }

  // 9. Create a Sample Research Brief
  if (firstDoc && secondDoc) {
    await prisma.researchBrief.create({
      data: {
        title: 'Investigation into Industrial Groundwater Contamination and Regulatory Concealment',
        topic: 'Apex Petrochemical Aquifer Contamination',
        status: 'PUBLISHED',
        executiveSummary: 'This research brief compiles primary evidence documenting corporate knowledge of toxic chemical leaching into public drinking water aquifers prior to state regulatory intervention. Contemporary logs and sworn testimony prove notice was established as early as 1982.',
        historicalTimeline: [
          { date: '1982-08-12', event: 'Dr. Aris Vance submits 48-page geological audit alerting executives to casing micro-fractures.', sourceId: firstDoc.id, sourceTitle: firstDoc.title },
          { date: '1986-10-22', event: 'Metropolitan Investigative Journal publishes landmark exposé revealing benzene levels 400x above federal limits.', sourceId: firstDoc.id, sourceTitle: firstDoc.title },
          { date: '2004-09-18', event: 'Dr. Vance interview confirms duplicate microfiches secured in safe-deposit box preserved federal grand jury indictment.', sourceId: secondDoc.id, sourceTitle: secondDoc.title },
        ],
        keyEntities: [
          { name: 'Apex Petrochemical', role: 'Defendant Corporation', count: 14 },
          { name: 'Dr. Aris Vance', role: 'Whistleblower Geochemist', count: 18 },
        ],
        previousEvents: [
          { event: 'Initial Annular Pressure Fluctuations', context: 'Recorded on shift logs indicating hydraulic breach.', significance: 'Earliest physical indicator of structural failure.' },
        ],
        supportingEvidence: [
          { claim: 'Acoustic logging traces were presented to corporate leadership in October 1982.', citationIndex: 1, confidence: 0.98 },
          { claim: 'Benzene and TCE concentrations exceeded federal thresholds by 400x.', citationIndex: 2, confidence: 0.96 },
        ],
        conflictingAccounts: [
          {
            topic: 'Timing of Structural Casing Breach',
            accountA: 'Corporate defense claimed casing failure was an unforeseen 1985 seismic anomaly.',
            accountB: 'Original 1982 shift logs proved ongoing hydraulic migration three years earlier.',
            sourceDetails: 'Contrasted against corporate filings and Dr. Vance contemporaneously preserved microfiches.',
          },
        ],
        knowledgeGaps: [
          { question: 'Did external state regulators receive anonymized water samples before 1986?', reasonForUncertainty: 'State DEQ archived correspondence files from 1983-1984 remain water-damaged and unindexed.' },
        ],
        sourceList: [
          { index: 1, documentId: firstDoc.id, title: firstDoc.title, author: 'Marcus Thorne', publication: 'Metropolitan Investigative Journal', date: '1986-10-22' },
          { index: 2, documentId: secondDoc.id, title: secondDoc.title, author: 'Marcus Thorne', publication: 'Metropolitan Investigative Journal', date: '2004-09-18' },
        ],
        createdById: journalistUser.id,
        citations: {
          create: [
            {
              documentId: firstDoc.id,
              citationIndex: 1,
              statementText: 'Disposal well No. 4 suffered cement casing micro-fractures at the 3,200-foot level.',
              excerptText: firstDoc.summary || firstDoc.content.slice(0, 200),
              confidenceScore: 0.98,
            },
            {
              documentId: secondDoc.id,
              citationIndex: 2,
              statementText: 'The pressure transducers inside the annular space began fluctuating by more than twelve percent per shift.',
              excerptText: secondDoc.summary || secondDoc.content.slice(0, 200),
              confidenceScore: 0.96,
            },
          ],
        },
      },
    });
  }

  // 10. Create initial audit log entries
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'System',
      details: { message: 'Database initialized with verified archival corpus, users, and full-text indexes.' },
    },
  });

  console.log('StoryVault seed completed successfully!');
  console.log('Seeded Users:');
  console.log('  - Journalist: journalist@storyvault.news / Password123!');
  console.log('  - Editor:     editor@storyvault.news     / Password123!');
  console.log('  - Archivist:  archivist@storyvault.news  / Password123!');
  console.log('  - Admin:      admin@storyvault.news      / Password123!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
