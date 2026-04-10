import { PrismaClient, Role } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Database seeden...')

  // Admin
  const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
  const ADMIN_PASS  = process.env.SEED_ADMIN_PASS  ?? 'changeme123'
  const PARENT_EMAIL = process.env.SEED_PARENT_EMAIL ?? 'ouder@example.com'
  const PARENT_PASS  = process.env.SEED_PARENT_PASS  ?? 'changeme123'
  const CHILD_NAME   = process.env.SEED_CHILD_NAME   ?? 'Kind'
  const CHILD_EMAIL  = process.env.SEED_CHILD_EMAIL  ?? 'kind@example.com'
  const CHILD_PIN    = process.env.SEED_CHILD_PIN    ?? '0000'

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: 'Admin',
      email: ADMIN_EMAIL,
      password: await argon2.hash(ADMIN_PASS, { type: argon2.argon2id }),
      role: Role.admin,
    },
  })
  console.log('✅ Admin aangemaakt:', admin.email)

  // Ouder
  const parent = await prisma.user.upsert({
    where: { email: PARENT_EMAIL },
    update: {},
    create: {
      name: 'Ouder',
      email: PARENT_EMAIL,
      password: await argon2.hash(PARENT_PASS, { type: argon2.argon2id }),
      role: Role.parent,
    },
  })
  console.log('✅ Ouder aangemaakt:', parent.email)

  // Kind
  const child = await prisma.user.upsert({
    where: { email: CHILD_EMAIL },
    update: {},
    create: {
      name: CHILD_NAME,
      email: CHILD_EMAIL,
      pin: await argon2.hash(CHILD_PIN, { type: argon2.argon2id }),
      role: Role.child,
      avatarId: 'meisje-1',
      gender: 'meisje',
    },
  })
  console.log('✅ Kind aangemaakt:', child.name, `(PIN: ${CHILD_PIN})`)

  // Koppel kind aan ouder en admin
  for (const parentUser of [admin, parent]) {
    await prisma.parentChild.upsert({
      where: { parentId_childId: { parentId: parentUser.id, childId: child.id } },
      update: {},
      create: { parentId: parentUser.id, childId: child.id, isPrimary: true },
    })
  }
  console.log('✅ Kind gekoppeld aan ouders')

  // Standaard token-configs (globale configs, sourceId = null)
  const defaultConfigs = [
    { sourceType: 'morning_routine' as const, tokensPerCompletion: 3 },
    { sourceType: 'emotion_checkin' as const, tokensPerCompletion: 1 },
    { sourceType: 'bedtime_routine' as const, tokensPerCompletion: 3 },
    { sourceType: 'streak' as const, tokensPerCompletion: 2 },
  ]

  for (const cfg of defaultConfigs) {
    const exists = await prisma.tokenConfig.findFirst({
      where: { childId: child.id, sourceType: cfg.sourceType, sourceId: null },
    })
    if (!exists) {
      await prisma.tokenConfig.create({
        data: {
          childId: child.id,
          sourceType: cfg.sourceType,
          enabled: true,
          tokensPerCompletion: cfg.tokensPerCompletion,
          createdById: admin.id,
        },
      })
    }
  }

  // Standaard beloningen
  const rewards = [
    { title: '15 min extra schermtijd', costTokens: 5, category: 'schermtijd', sortOrder: 1 },
    { title: 'Samen een spelletje spelen', costTokens: 10, category: 'activiteit', sortOrder: 2 },
    { title: 'Kiezen wat we eten vanavond', costTokens: 20, category: 'activiteit', sortOrder: 3 },
    { title: 'Uitstapje naar het zwembad', costTokens: 50, category: 'uitstapje', sortOrder: 4 },
    { title: 'Groot cadeau', costTokens: 100, category: 'cadeau', sortOrder: 5 },
  ]

  for (const reward of rewards) {
    const existing = await prisma.reward.findFirst({
      where: { childId: child.id, title: reward.title },
    })
    if (!existing) {
      await prisma.reward.create({
        data: { ...reward, childId: child.id, requiresApproval: true },
      })
    }
  }
  console.log('✅ Standaard beloningen aangemaakt')

  // Dagschema voor elke weekdag (maandag t/m vrijdag = schooldagen)
  const schoolActivities = [
    { title: 'Opstaan & aankleden', icon: '👕', startTime: '07:00', durationMinutes: 20, color: '#F2C94C',
      steps: [{ title: 'Uit bed komen' }, { title: 'Naar toilet' }, { title: 'Aankleden' }] },
    { title: 'Ontbijt', icon: '🥣', startTime: '07:20', durationMinutes: 20, color: '#E8734A', steps: [] },
    { title: 'Tanden poetsen & wassen', icon: '🦷', startTime: '07:40', durationMinutes: 10, color: '#7BAFA3',
      steps: [{ title: 'Tanden poetsen (2 min)' }, { title: 'Gezicht wassen' }, { title: 'Haar kammen' }] },
    { title: 'Schooltas inpakken', icon: '🎒', startTime: '07:50', durationMinutes: 10, color: '#5B8C5A',
      steps: [{ title: 'Agenda in de tas' }, { title: 'Brooddoos erin' }, { title: 'Waterfles erin' }, { title: 'Gymkleren check' }] },
    { title: 'Naar school', icon: '🚌', startTime: '08:10', durationMinutes: 20, color: '#A8C5D6', steps: [] },
    { title: 'School', icon: '🏫', startTime: '08:30', durationMinutes: 360, color: '#8C7B6B', steps: [] },
    { title: 'Thuiskomen & snack', icon: '🍎', startTime: '14:30', durationMinutes: 20, color: '#E8734A', steps: [] },
    { title: 'Huiswerk / oefenen', icon: '📚', startTime: '15:00', durationMinutes: 45, color: '#7BAFA3',
      steps: [{ title: 'Agenda nakijken wat er moet' }, { title: 'Huiswerk maken' }, { title: 'Tas klaar voor morgen' }] },
    { title: 'Vrije tijd', icon: '🎮', startTime: '15:45', durationMinutes: 105, color: '#F2C94C', steps: [] },
    { title: 'Avondeten', icon: '🍽️', startTime: '17:30', durationMinutes: 30, color: '#E8734A', steps: [] },
    { title: 'Vrije tijd (familie)', icon: '🛋️', startTime: '18:00', durationMinutes: 90, color: '#5B8C5A', steps: [] },
    { title: 'Bedtijdroutine', icon: '🌙', startTime: '19:30', durationMinutes: 30, color: '#A8C5D6',
      steps: [{ title: 'Pyjama aan' }, { title: 'Tanden poetsen' }, { title: 'Naar toilet' }, { title: 'In bed liggen' }, { title: 'Boekje lezen of luisteren' }] },
    { title: 'Slaaptijd', icon: '💤', startTime: '20:00', durationMinutes: 600, color: '#8C7B6B', steps: [] },
  ]

  const weekendActivities = [
    { title: 'Rustig wakker worden', icon: '☀️', startTime: '08:00', durationMinutes: 30, color: '#F2C94C', steps: [] },
    { title: 'Ontbijt', icon: '🥐', startTime: '08:30', durationMinutes: 30, color: '#E8734A', steps: [] },
    { title: 'Aankleden', icon: '👕', startTime: '09:00', durationMinutes: 15, color: '#7BAFA3',
      steps: [{ title: 'Naar toilet' }, { title: 'Aankleden' }, { title: 'Tanden poetsen' }] },
    { title: 'Vrije tijd', icon: '🎨', startTime: '09:15', durationMinutes: 165, color: '#F2C94C', steps: [] },
    { title: 'Lunch', icon: '🥪', startTime: '12:00', durationMinutes: 30, color: '#E8734A', steps: [] },
    { title: 'Middagactiviteit', icon: '🌳', startTime: '12:30', durationMinutes: 180, color: '#5B8C5A', steps: [] },
    { title: 'Avondeten', icon: '🍽️', startTime: '17:30', durationMinutes: 30, color: '#E8734A', steps: [] },
    { title: 'Bedtijdroutine', icon: '🌙', startTime: '20:00', durationMinutes: 30, color: '#A8C5D6',
      steps: [{ title: 'Pyjama aan' }, { title: 'Tanden poetsen' }, { title: 'In bed liggen' }] },
    { title: 'Slaaptijd', icon: '💤', startTime: '20:30', durationMinutes: 600, color: '#8C7B6B', steps: [] },
  ]

  // Maandag t/m vrijdag = schooldag (1-5), zaterdag+zondag = weekend (0, 6)
  for (let day = 0; day <= 6; day++) {
    const activities = day === 0 || day === 6 ? weekendActivities : schoolActivities

    const existing = await prisma.schedule.findFirst({ where: { userId: child.id, dayOfWeek: day } })
    if (existing) continue

    const schedule = await prisma.schedule.create({
      data: { userId: child.id, dayOfWeek: day },
    })

    for (let i = 0; i < activities.length; i++) {
      const { steps, ...actData } = activities[i]
      await prisma.activity.create({
        data: {
          ...actData,
          scheduleId: schedule.id,
          sortOrder: i,
          notifyBefore: [5, 1],
          steps: steps.length ? { create: steps.map((s, j) => ({ title: s.title, sortOrder: j })) } : undefined,
        },
      })
    }
  }
  console.log('✅ Dagschema\'s aangemaakt (ma-vr: school, za-zo: weekend)')

  // Voorbeeldtaken voor vandaag
  const todayTasks = [
    {
      title: 'Huiswerk wiskunde',
      icon: '📐',
      durationMinutes: 20,
      steps: [
        { title: 'Bladzijde 34, opgave 1 t/m 5' },
        { title: 'Nakijken met antwoordenboek' },
        { title: 'Tas inpakken voor morgen' },
      ],
    },
    {
      title: 'Kamer opruimen',
      icon: '🧹',
      durationMinutes: 15,
      steps: [
        { title: 'Kleren ophangen of in de was' },
        { title: 'Speelgoed op zijn plek' },
        { title: 'Bureau netjes' },
      ],
    },
  ]

  for (const t of todayTasks) {
    const exists = await prisma.task.findFirst({ where: { childId: child.id, title: t.title } })
    if (!exists) {
      await prisma.task.create({
        data: {
          childId: child.id,
          createdById: admin.id,
          title: t.title,
          icon: t.icon,
          durationMinutes: t.durationMinutes,
          scheduledFor: new Date(),
          steps: { create: t.steps.map((s, i) => ({ title: s.title, sortOrder: i })) },
        },
      })
    }
  }
  console.log('✅ Voorbeeldtaken aangemaakt')

  // ── Voorbeeldoefeningen (wiskunde niveau 1-2) ─────────────────
  const sampleExercises = [
    // Niveau 1 — optellen tot 10
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 1, tags: ['optellen', 'tot10'],
      questionJson: { question: 'Hoeveel is 3 + 4?', options: ['5', '6', '7', '8'], answer: '7',
        hints: [{ type: 'text', content: 'Tel op je vingers: 3... en dan nog 4 erbij.' }],
        explanation: '3 + 4 = 7. Tel: 4, 5, 6, 7!' } },
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 1, tags: ['optellen', 'tot10'],
      questionJson: { question: 'Hoeveel is 5 + 3?', options: ['6', '7', '8', '9'], answer: '8',
        hints: [{ type: 'text', content: 'Begin bij 5 en tel 3 verder.' }],
        explanation: '5 + 3 = 8. 5, 6, 7, 8!' } },
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 1, tags: ['aftrekken', 'tot10'],
      questionJson: { question: 'Hoeveel is 9 - 4?', options: ['3', '4', '5', '6'], answer: '5',
        hints: [{ type: 'text', content: 'Begin bij 9 en tel terug: 8, 7, 6, 5, 4.' }],
        explanation: '9 - 4 = 5.' } },
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 1, tags: ['tellen', 'getallen'],
      questionJson: { question: 'Welk getal komt na 7?', options: ['6', '7', '8', '9'], answer: '8',
        hints: [{ type: 'text', content: 'Tel de rij: 5, 6, 7, ... wat komt daarna?' }],
        explanation: 'Na 7 komt 8!' } },
    // Niveau 2 — tafels van 2 en 3
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 2, tags: ['tafels', 'tafel2'],
      questionJson: { question: 'Hoeveel is 2 × 6?', options: ['10', '12', '14', '8'], answer: '12',
        hints: [{ type: 'text', content: 'Denk: 2 groepen van 6. Tel: 6 + 6 = ?' }],
        explanation: '2 × 6 = 12. Of: 6 + 6 = 12.' } },
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 2, tags: ['tafels', 'tafel3'],
      questionJson: { question: 'Hoeveel is 3 × 4?', options: ['9', '10', '12', '11'], answer: '12',
        hints: [{ type: 'text', content: 'Denk aan 3 zakjes met elk 4 snoepjes. 4 + 4 + 4 = ?' }],
        explanation: '3 × 4 = 12. Want 4 + 4 + 4 = 12.' } },
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 2, tags: ['tafels', 'tafel5'],
      questionJson: { question: 'Hoeveel is 5 × 3?', options: ['10', '12', '15', '20'], answer: '15',
        hints: [{ type: 'text', content: 'Tafels van 5 eindigen altijd op 0 of 5. 5, 10, 15...' }],
        explanation: '5 × 3 = 15.' } },
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 2, tags: ['optellen', 'tot100'],
      questionJson: { question: 'Hoeveel is 24 + 13?', options: ['35', '36', '37', '38'], answer: '37',
        hints: [{ type: 'text', content: 'Eerste de tienen: 20 + 10 = 30. Dan de enen: 4 + 3 = 7.' }],
        explanation: '24 + 13 = 37. Eerst tientallen, dan eenheden.' } },
    // Niveau 2 — kloklezen
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 2, tags: ['kloklezen', 'tijd'],
      questionJson: { question: 'Het is half drie. Wat is de tijd?', options: ['2:15', '2:30', '3:00', '3:30'], answer: '2:30',
        hints: [{ type: 'text', content: 'Half drie = halverwege twee en drie = 2:30.' }],
        explanation: 'Half drie = 2 uur 30 minuten = 2:30.' } },
    // Niveau 3 — aftrekken groter
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 3, tags: ['aftrekken', 'tot100'],
      questionJson: { question: 'Hoeveel is 56 - 23?', options: ['31', '32', '33', '34'], answer: '33',
        hints: [{ type: 'text', content: 'Eerst de tienen: 50 - 20 = 30. Dan de enen: 6 - 3 = 3.' }],
        explanation: '56 - 23 = 33.' } },
    // Niveau 3 — geld
    { subject: 'wiskunde', type: 'multiple_choice', difficulty: 3, tags: ['geld', 'rekenen'],
      questionJson: { question: 'Je hebt €2. Een ijsje kost €1,50. Hoeveel heb je over?', options: ['€0,25', '€0,50', '€0,75', '€1,00'], answer: '€0,50',
        hints: [{ type: 'text', content: 'Je begint met 200 cent. Trek er 150 cent van af.' }],
        explanation: '€2,00 - €1,50 = €0,50.' } },
  ]

  let exercisesCreated = 0
  for (const ex of sampleExercises) {
    const exists = await prisma.exercise.findFirst({
      where: {
        subject: ex.subject as any,
        difficulty: ex.difficulty,
        title: (ex.questionJson as any).question.slice(0, 50),
      },
    })
    if (!exists) {
      await prisma.exercise.create({
        data: {
          subject: ex.subject as any,
          type: ex.type as any,
          difficulty: ex.difficulty,
          title: (ex.questionJson as any).question.slice(0, 80),
          questionJson: ex.questionJson as any,
          tags: ex.tags,
          isAiGenerated: false,
          isApproved: true,
        },
      })
      exercisesCreated++
    }
  }
  console.log(`✅ ${exercisesCreated} voorbeeldoefeningen aangemaakt`)

  console.log('\n🎉 Seed voltooid!')
  console.log(`   Admin: ${ADMIN_EMAIL} / ${ADMIN_PASS}`)
  console.log(`   Ouder: ${PARENT_EMAIL} / ${PARENT_PASS}`)
  console.log(`   Kind:  ${CHILD_NAME} (PIN: ${CHILD_PIN})`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
