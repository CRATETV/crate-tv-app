// components/zine/templates.ts — the starting points for writing in The Unpack.
//
// Each template is an outline: the blocks are already in the right order and every
// block has a writing prompt (`hint`) that shows in the editor and disappears when you
// save. Nothing here is the story's text; it is only the questions that get you going.

import type { ZineSection, EditorialStory } from '../../types';

export interface StoryTemplate {
    id: string;
    name: string;
    icon: string;
    tagline: string;
    type: EditorialStory['type'];
    length: string;
    whenToUse: string;
    tips: string[];
    sections: Omit<ZineSection, 'id'>[];
}

const t = (hint: string): Omit<ZineSection, 'id'> => ({ type: 'text', content: '', hint });
const h = (hint: string, content = ''): Omit<ZineSection, 'id'> => ({ type: 'header', content, hint });
const q = (hint: string): Omit<ZineSection, 'id'> => ({ type: 'quote', content: '', hint });
const img = (hint: string): Omit<ZineSection, 'id'> => ({ type: 'image', content: '', hint });

export const STORY_TEMPLATES: StoryTemplate[] = [
    {
        id: 'film-feature',
        name: 'Film feature',
        icon: '🎬',
        tagline: 'Introduce one film on CRATE and make people want to press play.',
        type: 'FILM_FEATURE',
        length: '400 to 700 words',
        whenToUse: 'A new film arrives, a film is in the festival, or one deserves a second look.',
        tips: [
            'Open with one moment from the film (a line, an image, a feeling), not "This film is about…".',
            'Say who made it and why they are worth watching now.',
            'Give away the mood, never the ending.',
            'End by sending people to watch: add the film card at the bottom.',
        ],
        sections: [
            t('Your opening. Start in the middle of a scene or with the feeling the film leaves you with. 2 to 4 sentences.'),
            h('A heading that names the idea of the film, such as "A family dinner that goes quiet".'),
            t('What it is about, without the ending. Who are the people, what do they want, what is in the way?'),
            img('A still from the film. Use a strong, clear frame, and add a caption and credit.'),
            t('What makes it special: the acting, the look, the sound, the place. Be specific. Name a scene.'),
            q('One line that sums it up. It can be a line of dialogue or a line from the director.'),
            t('Who made it, and a little about them. Where are they from, what else have they made?'),
            { type: 'film', content: '', hint: 'Pick the film. Readers get a card with the poster and a Watch button.' },
        ],
    },
    {
        id: 'directors-notes',
        name: "Director's notes",
        icon: '🎙️',
        tagline: 'The filmmaker tells their own story, with their own pictures.',
        type: 'DIRECTORS_NOTES',
        length: '300 to 600 words, plus 3 to 6 pictures',
        whenToUse: 'Any film on CRATE. Email the director the questions below and edit what comes back.',
        tips: [
            'It is their voice. Keep their words, fix only spelling and clarity, and always get their OK before publishing.',
            'Ask for pictures: behind-the-scenes, a favorite frame, the crew, the location, even the script page.',
            'Questions work best when they are specific. "What was the hardest day?" beats "Tell us about the shoot."',
            'Credit every photo to the person who took it.',
        ],
        sections: [
            { type: 'callout', label: "Director's note", content: '', hint: 'The director in one paragraph: where the idea came from, in their own words.' },
            h('Where it started', 'Where it started'),
            t('The spark. A memory, a person, an argument, a place. What was the first image they had?'),
            img('A picture from early on: a sketch, a script page, the location scout.'),
            h('The hardest day', 'The hardest day'),
            t('What went wrong, and what they did about it. This is usually the best part, so let them tell it.'),
            { type: 'gallery', content: '', caption: '', hint: 'Behind-the-scenes pictures, one web address per line. Add a caption that names the people in them.' },
            h('What I would tell someone starting out', 'What I would tell someone starting out'),
            t('Their advice in a few sentences. Short and honest.'),
            q('One line from the director that people will remember.'),
            { type: 'film', content: '', hint: 'Pick the film so readers can watch it.' },
        ],
    },
    {
        id: 'interview',
        name: 'Interview',
        icon: '💬',
        tagline: 'A conversation with a filmmaker, actor, programmer or crew member.',
        type: 'INTERVIEW',
        length: '500 to 900 words',
        whenToUse: 'You talked with someone interesting, by email, phone or in person.',
        tips: [
            'Start with a short introduction (3 to 5 sentences) about who they are and why you wanted to talk.',
            'Make each question a heading and each answer a paragraph or two. Cut the boring parts.',
            'Put the best answer up top as a pull quote.',
            'Finish with something forward-looking: what they are working on, where to watch their work.',
        ],
        sections: [
            t('Who is this person and why are you talking to them? Set the scene in a few sentences.'),
            q('The best line from the interview.'),
            h('Your first question, as a heading.'),
            t('Their answer.'),
            h('Your second question.'),
            t('Their answer.'),
            img('A portrait of them or a picture from their work. Add a caption and credit.'),
            h('Your third question.'),
            t('Their answer.'),
            h('What is next?', 'What is next?'),
            t('What they are working on and where people can watch or follow them.'),
            { type: 'film', content: '', hint: 'Optional: add a film card for the work you talked about.' },
        ],
    },
    {
        id: 'festival-voices',
        name: 'From the festival',
        icon: '🎟️',
        tagline: 'A festival tells its own story and shows off its lineup.',
        type: 'FESTIVAL_VOICES',
        length: '400 to 800 words, plus 2 to 6 pictures',
        whenToUse: 'A partner festival is coming up, running, or just finished. Partners can write this themselves from their portal.',
        tips: [
            'Answer: why does this festival exist, and who is it for?',
            'Pick 3 films to spotlight and say in a sentence why each one matters.',
            'Be practical: dates, how to watch, how to get tickets.',
            'Use pictures of people (filmmakers, audiences, the venue), not just posters.',
        ],
        sections: [
            t('Open with the festival in one picture: a room, a crowd, a moment. 2 to 4 sentences.'),
            h('Why we started', 'Why we started'),
            t('The reason this festival exists, in your own words. Who is it for?'),
            img('A picture of the festival, with a caption and credit.'),
            h('Three films to see', 'Three films to see'),
            t('Three films, one short paragraph each: what it is and why you chose it.'),
            q('A line from a filmmaker, a juror or an audience member.'),
            h('How to join us', 'How to join us'),
            t('Dates, how to watch, how to buy a pass, and where to follow the festival.'),
        ],
    },
    {
        id: 'watch-party-recap',
        name: 'Watch party recap',
        icon: '🍿',
        tagline: 'What happened on premiere night, while it is still fresh.',
        type: 'NEWS',
        length: '250 to 450 words',
        whenToUse: 'The day after a watch party or premiere.',
        tips: [
            'Lead with the best moment of the night.',
            'Share a few real reactions from the chat (get permission if you use names).',
            'Say who was there and how many people tuned in, if you know.',
            'Tell people what is coming next so they stay.',
        ],
        sections: [
            t('The best moment of the night, in a sentence or two.'),
            h('The room', 'The room'),
            t('Who joined, where from, how it felt. Numbers help: how many people, how many countries.'),
            q('One reaction from the chat, with the first name or a nickname.'),
            img('A screenshot or a photo from the night. Add a caption.'),
            h('What is next', 'What is next'),
            t('The next film, event or watch party, with the date.'),
            { type: 'film', content: '', hint: 'The film the party was for, or the next one.' },
        ],
    },
    {
        id: 'behind-the-scenes',
        name: 'Photo essay',
        icon: '📸',
        tagline: 'Mostly pictures, with just enough words.',
        type: 'SPOTLIGHT',
        length: '100 to 250 words, plus 6 to 12 pictures',
        whenToUse: 'A shoot, a set, a festival weekend, a premiere party.',
        tips: [
            'Choose your best 6 to 12 pictures, not all of them. Strong beginning, strong ending.',
            'Write a caption that tells a tiny story (who, where, what is happening).',
            'Mix wide shots, close-ups and details.',
            'Credit the photographer.',
        ],
        sections: [
            t('Two or three sentences to set the scene: where and when, and what we are looking at.'),
            { type: 'gallery', content: '', caption: '', hint: 'Your first set of pictures, one web address per line.' },
            h('A short heading for the middle of the story.'),
            t('One paragraph about a moment you want people to notice.'),
            { type: 'gallery', content: '', caption: '', hint: 'The second set of pictures, one web address per line.' },
            q('One line that sums the day up.'),
        ],
    },
    {
        id: 'news',
        name: 'News',
        icon: '📰',
        tagline: 'A quick announcement: who, what, when, where.',
        type: 'NEWS',
        length: '120 to 300 words',
        whenToUse: 'A new film, a date, a partnership, a prize, a change.',
        tips: [
            'Put the most important fact in the first sentence.',
            'Give the date and time with the time zone.',
            'Tell people exactly what to do next: watch, buy, sign up.',
            'Short is good. Stop when you have said it.',
        ],
        sections: [
            t('The news in one or two sentences: what is happening and when.'),
            t('The details: who is involved, where to watch, how much, anything people need to know.'),
            { type: 'film', content: '', hint: 'Optional: add a film card.' },
        ],
    },
    {
        id: 'essay',
        name: 'Essay',
        icon: '✍️',
        tagline: 'Your own point of view on film, culture or the work of making things.',
        type: 'DEEP_DIVE',
        length: '800 to 1,500 words',
        whenToUse: 'You have something to say that does not fit anywhere else.',
        tips: [
            'Make one clear point and keep returning to it.',
            'Use a personal story or one specific example to open.',
            'Break it up with headings every 3 or 4 paragraphs.',
            'Read it out loud before you publish. Fix anything that does not sound like you.',
        ],
        sections: [
            t('Open with a story or a specific moment that leads into your point.'),
            h('First part of the argument.'),
            t('Make your case. One idea per paragraph.'),
            q('Your key sentence, the one you want people to remember.'),
            h('Second part.'),
            t('Go deeper. Give an example or a counterpoint.'),
            h('Where this leaves us', 'Where this leaves us'),
            t('Bring it home. What should the reader think or do?'),
        ],
    },
];

export const BLANK_TEMPLATE: StoryTemplate = {
    id: 'blank', name: 'Blank page', icon: '📄', tagline: 'Start from nothing.', type: 'SPOTLIGHT', length: 'Any length',
    whenToUse: 'You know what you want to write.', tips: [], sections: [t('Start writing…')],
};

export const templateById = (id?: string) => STORY_TEMPLATES.find(x => x.id === id) || (id === 'blank' ? BLANK_TEMPLATE : undefined);

let n = 0;
export const newSectionId = () => `sec_${Date.now().toString(36)}_${(n++).toString(36)}`;

/** Fresh blocks for a template, each with its own id. */
export function sectionsFromTemplate(tpl: StoryTemplate): ZineSection[] {
    return tpl.sections.map(s => ({ ...s, id: newSectionId() })) as ZineSection[];
}

/** Ideas for stories you can come back to again and again. */
export const SERIES_IDEAS: { name: string; idea: string; how: string }[] = [
    { name: 'One Film, One Scene', idea: 'Pick one scene from a film on CRATE and write about only that scene.', how: 'Film feature · 300 words · a still and a film card' },
    { name: 'Meet the Director', idea: 'A short director\'s note from every filmmaker whose film premieres here.', how: "Director's notes · email 4 questions, edit what you get back" },
    { name: 'The Festival Desk', idea: 'Each partner festival writes one piece before their festival opens.', how: 'From the festival · invite them from the Partner portal' },
    { name: 'Premiere Night', idea: 'A recap the morning after every watch party, with the best chat moments.', how: 'Watch party recap · 250 words, one screenshot' },
    { name: 'From the Archive', idea: 'A story from Tobago or Philadelphia history that connects to a film on CRATE.', how: 'Essay or Spotlight · one old photo, one film card' },
    { name: 'The Reel Shelf', idea: 'Five films to watch this month, one sentence each, grouped by mood.', how: 'News · 200 words · five film cards' },
    { name: 'Behind the Credits', idea: 'Spotlight a crew role most people never think about: sound, editing, script supervisor.', how: 'Interview · three questions' },
    { name: 'First Time', idea: 'Filmmakers describe their first time showing a film to a real audience.', how: "Director's notes · very short, one picture" },
];
