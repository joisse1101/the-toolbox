import type { ChangeEvent, ReactNode } from 'react';
import type { Story } from '../../../../../../shared/types.ts';
import type { fieldCues } from './fieldCues.ts';

// The types the story form and its sections share.
export type Edit = (change: (draft: Story) => void) => void;
export type Cues = ReturnType<typeof fieldCues>;
export type ListFields = (...fields: string[]) => ReactNode;
export type TextField = 'epic' | 'feature' | 'title' | 'priority' | 'notes';
export type StoryPart = 'asA' | 'iWant' | 'soThat';
export type SetField = (key: TextField) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
export type SetStoryPart = (key: StoryPart) => (e: ChangeEvent<HTMLInputElement>) => void;
