/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dog, Owner } from './types';

export const MOCK_OWNERS: Owner[] = [
  {
    id: 'o1',
    firstName: 'Sofia',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia',
    bio: 'Loves sunset walks and artisanal dog treats.',
    city: 'Barcelona'
  },
  {
    id: 'o2',
    firstName: 'Mateo',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mateo',
    bio: 'Professional fetch thrower and mountain hiker.',
    city: 'Madrid'
  },
  {
    id: 'o3',
    firstName: 'Elena',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    bio: 'Dog photographer and volunteer at local shelters.',
    city: 'Valencia'
  }
];

export const MOCK_DOGS: Dog[] = [
  {
    id: 'd1',
    name: 'Dante',
    breed: 'Miniature Dachshund',
    age: '2 years',
    size: 'Small',
    energyLevel: 'Playful',
    personality: ['🎾 Fetch lover', '😴 Lazy mornings', '🐕 Friendly'],
    distance: '0.8 km away',
    imageUrl: 'https://images.unsplash.com/photo-1510772324354-94e803c4f997?q=80&w=600&auto=format&fit=crop',
    ownerId: 'o1',
    playdateHistory: [
      { id: 'ph1', date: '2024-03-20', companionName: 'Luna', status: 'Completed', location: 'Park de la Ciutadella' },
      { id: 'ph2', date: '2024-04-01', companionName: 'Cooper', status: 'Completed', location: 'Beach walk' }
    ]
  },
  {
    id: 'd2',
    name: 'Luna',
    breed: 'Golden Retriever',
    age: '3 years',
    size: 'Large',
    energyLevel: 'High Energy',
    personality: ['🌊 Loves water', '🎾 Ball obsessed', '👥 Extremely social'],
    distance: '1.2 km away',
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop',
    ownerId: 'o2'
  },
  {
    id: 'd3',
    name: 'Cooper',
    breed: 'Boxer',
    age: '1 year',
    size: 'Large',
    energyLevel: 'High Energy',
    personality: ['👅 Kisses expert', '🏃 Runner', '🥊 Play-wrestler'],
    distance: '2.5 km away',
    imageUrl: 'https://images.unsplash.com/photo-1583512676605-934d23712ee6?q=80&w=600&auto=format&fit=crop',
    ownerId: 'o3'
  },
  {
    id: 'd4',
    name: 'Mochi',
    breed: 'Shiba Inu',
    age: '4 years',
    size: 'Medium',
    energyLevel: 'Calm',
    personality: ['🦊 Independent', '🍖 Snack lover', '🤐 Quiet'],
    distance: '0.5 km away',
    imageUrl: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=600&auto=format&fit=crop',
    ownerId: 'o1'
  },
  {
    id: 'd5',
    name: 'Bella',
    breed: 'Corgi',
    age: '2 years',
    size: 'Small',
    energyLevel: 'Playful',
    personality: ['🍑 Wiggle butt', '👂 Big listener', '🏠 Homebody'],
    distance: '3.1 km away',
    imageUrl: 'https://images.unsplash.com/photo-1589924691106-07a2c85b6359?q=80&w=600&auto=format&fit=crop',
    ownerId: 'o2'
  },
  {
    id: 'd6',
    name: 'Oliver',
    breed: 'Poodle',
    age: '5 years',
    size: 'Medium',
    energyLevel: 'Calm',
    personality: ['🎩 Sophisticated', '🧠 Smarty pants', '🐩 Gentle'],
    distance: '4.0 km away',
    imageUrl: 'https://images.unsplash.com/photo-1591384387169-9df1d70fe5ae?q=80&w=600&auto=format&fit=crop',
    ownerId: 'o3'
  },
  {
    id: 'd7',
    name: 'Zeus',
    breed: 'German Shepherd',
    age: '3 years',
    size: 'Large',
    energyLevel: 'High Energy',
    personality: ['🛡️ Protective', '🌳 Woods lover', '🎾 Search & rescue'],
    distance: '5.2 km away',
    imageUrl: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?q=80&w=600&auto=format&fit=crop',
    ownerId: 'o1'
  },
  {
    id: 'd8',
    name: 'Coco',
    breed: 'Beagle',
    age: '2 years',
    size: 'Medium',
    energyLevel: 'Playful',
    personality: ['👃 Scent hunter', '🗣️ Vocal', '🍔 Always hungry'],
    distance: '1.8 km away',
    imageUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=600&auto=format&fit=crop',
    ownerId: 'o2'
  }
];

export const Q_AND_A = [
  { q: 'feeding', a: 'Most dogs do best with twice-daily feeding. High-quality protein should be the first ingredient!' },
  { q: 'socialization', a: 'Early socialization is key. Introduce your pup to new people, dogs, and environments gradually.' },
  { q: 'symptoms', a: 'If your dog is lethargic, skipping meals, or acting unusual, its best to consult a vet immediately.' },
  { q: 'training', a: 'Positive reinforcement works best! Reward good behavior with treats and praise.' },
  { q: 'breed', a: 'Every breed has unique needs. Dachshunds like me need to protect our backs, while Retrievers need lots of exercise!' },
  { q: 'exercise', a: 'Active breeds need at least 60-90 minutes of exercise daily. Even calm dogs need a good 30-minute walk.' },
  { q: 'grooming', a: 'Regular brushing keeps the coat healthy and reduces shedding. Don\'t forget to clip those nails!' },
  { q: 'toys', a: 'Choose toys appropriate for your dog\'s size and chewing style. Supervise them with new toys!' },
  { q: 'puppy', a: 'Puppies need frequent potty breaks and clear boundaries. Consistency is your best friend!' },
  { q: 'health', a: 'Keept records of vaccinations and regular check-ups. Preventive care saves lives and paws!' }
];
