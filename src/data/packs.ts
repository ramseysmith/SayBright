export interface PackAffirmation {
  id: string;
  text: string;
}

export interface AffirmationPack {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  price: string;
  productId: string;
  affirmations: PackAffirmation[];
}

function buildPackAffirmations(
  prefix: string,
  texts: string[]
): PackAffirmation[] {
  return texts.map((text, i) => ({
    id: `${prefix}_${String(i + 1).padStart(2, '0')}`,
    text,
  }));
}

const INTERVIEW_TEXTS = [
  'I walk into this interview prepared, present, and ready to be myself.',
  'My experience speaks for me, and my words come easily today.',
  'I am the right candidate for this room and this moment.',
  'Tough questions invite me to show how I think, not test my worth.',
  'I handle pressure with the same calm I bring to my best work.',
  'Rejection is redirection, and the right opportunity is on its way.',
  'My nerves are just energy ready to fuel a great conversation.',
  'I belong in conversations about my own career.',
  'I let curiosity lead me when an interview question surprises me.',
  'Every interview teaches me something, no matter the outcome.',
  'I do not need to know everything to be impressive.',
  'I trust the version of myself that prepared for this moment.',
  'My background, my skills, and my voice are exactly enough.',
  'I leave every interview lighter, knowing I represented myself well.',
  'The right team will recognize my value the moment we meet.',
];

const NEWPARENT_TEXTS = [
  'I am the parent my child was meant to find.',
  'My patience grows each time I choose presence over perfection.',
  'The hard nights are temporary, and so is this exhaustion.',
  'I trust my instincts even when the books disagree.',
  'My love is more powerful than any advice column.',
  'Every small kindness I offer my baby builds their entire world.',
  'I am allowed to ask for help and to receive it gladly.',
  'My body did something extraordinary, and it is still working hard.',
  'I will laugh at the chaos when I have a moment to breathe.',
  'My child does not need a perfect parent, just a present one.',
  'I forgive myself for the moments I lost my patience today.',
  'The way I show up for my family today is enough.',
  'I am still me beneath the tiredness, and that me matters.',
  'My partner and I are a team, and we are figuring this out.',
  'Tonight will end, and tomorrow I will meet my child again.',
];

const BREAKUP_TEXTS = [
  'I am allowed to grieve a love that no longer fits my life.',
  'Letting go is not failure, it is choosing my own peace.',
  'I am whole on my own, and I always have been.',
  'The right love does not require me to abandon myself.',
  'My heart is healing in ways I cannot always feel today.',
  'I trust that this ending makes room for something truer.',
  'I deserve love that feels easy, honest, and steady.',
  'Missing them does not mean I should go back.',
  'Today I choose myself over the comfort of what was familiar.',
  'I am rediscovering who I am beyond who I was with them.',
  'My value did not leave when they did.',
  'I release the version of the future I imagined with them.',
  'Each day I am a little softer toward myself.',
  'I am becoming someone my future self will be proud of.',
  'The love I want is on its way, and I am ready.',
];

const EXAMS_TEXTS = [
  'My preparation is enough, and my mind is ready for this.',
  'I have studied, I have practiced, and now I trust myself.',
  'My memory is stronger than my anxiety today.',
  'I read each question fully, then answer with calm focus.',
  'Hard questions deserve my best guess, not my panic.',
  'I breathe through the nervous moments and return to the page.',
  'My intelligence is not measured by a single exam.',
  'I trust the work I have already put in.',
  'My pace is my own, and I will use my time well.',
  'I deserve this seat in this room as much as anyone.',
  'Today I walk in calm, prepared, and ready to perform well.',
  'My focus is a muscle I have trained for this exact moment.',
  'I am not my grades; I am the effort behind them.',
  'The right answers are inside me, ready when I am.',
  'After this exam, I get to rest and be proud of myself.',
];

const SOBRIETY_TEXTS = [
  'Today I choose me, and that is reason enough to keep going.',
  'My recovery is not linear, and I am still moving forward.',
  'Cravings are messengers, not commands I am required to obey.',
  'I forgive myself for past versions of me who were hurting.',
  'One sober day, then another, is how a sober life is built.',
  'My future self is rooting for me right now.',
  'I am stronger than the urge to numb what I am feeling.',
  'Honesty with myself is the foundation of every good day.',
  'I deserve a life I do not need to escape.',
  'Reaching out for support is courage, not weakness.',
  'Today I am the proof that change is possible.',
  'I trust the people walking this path beside me.',
  'I notice my emotions, name them, and let them pass through.',
  'My sobriety is the most generous gift I give myself.',
  'I am building a life I am proud to wake up to.',
];

const SPEAKING_TEXTS = [
  'My voice matters, and the room is ready to hear it.',
  'I am the right person to deliver this message right now.',
  'My nerves are just my body preparing to do something great.',
  'I speak slowly, breathe deeply, and trust the silence between sentences.',
  'I prepared well, and I trust myself to ride a few surprises.',
  'Eye contact is a gift I give the people listening.',
  'I am sharing, not performing, and the audience is on my side.',
  'My voice carries clearly when I let myself stand tall.',
  'Mistakes only make me feel more human to the room.',
  'I let my passion lead and my preparation support me.',
  'I speak as someone who has earned a place at this microphone.',
  'The people in this room want me to do well today.',
  'I trust that my message will land where it is needed.',
  'Applause is not the goal; clarity and connection are.',
  'After today, I will be a little braver for the next stage.',
];

export const PACKS: AffirmationPack[] = [
  {
    id: 'pack_interview',
    name: 'Interview Confidence',
    description: 'Walk into every interview knowing you belong there.',
    emoji: '🎯',
    color: '#2196F3',
    price: '$0.99',
    productId: 'saybright_pack_interview',
    affirmations: buildPackAffirmations('pack_interview', INTERVIEW_TEXTS),
  },
  {
    id: 'pack_newparent',
    name: 'New Parent Energy',
    description: 'You are exactly the parent your child needs.',
    emoji: '👶',
    color: '#9C27B0',
    price: '$0.99',
    productId: 'saybright_pack_newparent',
    affirmations: buildPackAffirmations('pack_newparent', NEWPARENT_TEXTS),
  },
  {
    id: 'pack_breakup',
    name: 'Breakup Recovery',
    description: 'Rediscover who you are on the other side of goodbye.',
    emoji: '🦋',
    color: '#E91E63',
    price: '$0.99',
    productId: 'saybright_pack_breakup',
    affirmations: buildPackAffirmations('pack_breakup', BREAKUP_TEXTS),
  },
  {
    id: 'pack_exams',
    name: 'Exam Season',
    description: 'Your preparation is enough. Your mind is ready.',
    emoji: '📚',
    color: '#FF9800',
    price: '$0.99',
    productId: 'saybright_pack_exams',
    affirmations: buildPackAffirmations('pack_exams', EXAMS_TEXTS),
  },
  {
    id: 'pack_sobriety',
    name: 'Sobriety and Recovery',
    description: 'Every day you choose yourself is a victory.',
    emoji: '🌱',
    color: '#66BB6A',
    price: '$0.99',
    productId: 'saybright_pack_sobriety',
    affirmations: buildPackAffirmations('pack_sobriety', SOBRIETY_TEXTS),
  },
  {
    id: 'pack_speaking',
    name: 'Public Speaking',
    description: 'Your voice matters and the world is ready to hear it.',
    emoji: '🎤',
    color: '#FF6B6B',
    price: '$0.99',
    productId: 'saybright_pack_speaking',
    affirmations: buildPackAffirmations('pack_speaking', SPEAKING_TEXTS),
  },
];

export function getPackById(id: string): AffirmationPack | undefined {
  return PACKS.find((p) => p.id === id);
}

export function getPackByProductId(productId: string): AffirmationPack | undefined {
  return PACKS.find((p) => p.productId === productId);
}
