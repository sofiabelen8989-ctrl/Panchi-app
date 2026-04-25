/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dog, Owner } from "../types";
import { MOCK_DOGS, MOCK_OWNERS } from "../data";

const STORAGE_KEYS = {
  MY_DOG: 'panchi_my_dog',
  PLAYDATE_REQUESTS: 'panchi_requests'
};

export const PersistenceService = {
  saveMyDog: (dog: Partial<Dog>) => {
    localStorage.setItem(STORAGE_KEYS.MY_DOG, JSON.stringify(dog));
  },

  getMyDog: (): Dog | null => {
    const data = localStorage.getItem(STORAGE_KEYS.MY_DOG);
    return data ? JSON.parse(data) : null;
  },

  getDogById: (id: string): Dog | undefined => {
    const myDog = PersistenceService.getMyDog();
    if (myDog && myDog.id === id) return myDog;
    return MOCK_DOGS.find(d => d.id === id);
  },

  getOwnerById: (id: string): Owner | undefined => {
    if (id === 'o-me') {
      const data = localStorage.getItem('panchi_my_owner');
      if (data) return JSON.parse(data);
    }
    return MOCK_OWNERS.find(o => o.id === id);
  },

  saveRequest: (dogId: string) => {
    const requests = PersistenceService.getRequests();
    requests.add(dogId);
    localStorage.setItem(STORAGE_KEYS.PLAYDATE_REQUESTS, JSON.stringify(Array.from(requests)));
  },

  getRequests: (): Set<string> => {
    const data = localStorage.getItem(STORAGE_KEYS.PLAYDATE_REQUESTS);
    return new Set(data ? JSON.parse(data) : []);
  }
};
