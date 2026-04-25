/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Owner {
  id: string;
  firstName: string;
  avatar: string;
  bio?: string;
  city: string;
}

export interface Dog {
  id: string;
  name: string;
  breed: string;
  age: string;
  size: 'Small' | 'Medium' | 'Large';
  energyLevel: 'Calm' | 'Playful' | 'High Energy';
  personality: string[];
  distance: string;
  imageUrl: string;
  ownerId: string;
  playdateHistory?: PlaydateHistory[];
}

export interface PlaydateHistory {
  id: string;
  date: string;
  companionName: string;
  status: 'Completed' | 'Upcoming';
  location: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'panchi';
  timestamp: number;
}
