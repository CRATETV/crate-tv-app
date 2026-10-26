import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normTitle, guessFilm, type FilmChoice } from '../api/_lib/filmFileMatch';

const films: FilmChoice[] = [
    { key: 'ydkmn', title: "You Don't Know My Name", director: 'Salome Denoon' },
    { key: 'tino', title: 'TINO', director: 'Michael James Mina' },
    { key: 'home', title: 'Home' },
    { key: 'takemehome', title: 'Take Me Home' },
    { key: 'mirror', title: 'The Mirror Dance' },
    { key: 'run', title: 'Run' },
    { key: 'cafe', title: 'Café Noir' },
];

test('file names are cleaned the same way as titles', () => {
    assert.equal(normTitle("You Don't Know My Name (FINAL v2).MOV"), 'you dont know my name');
    assert.equal(normTitle('Cafe_Noir_ProRes_4K_2026.mov'), 'cafe noir');
});

test('each festival file finds its film', () => {
    assert.equal(guessFilm("You Don't Know My Name FINAL.mov", films), 'ydkmn');
    assert.equal(guessFilm('YOU-DONT-KNOW-MY-NAME_master_1080p.mp4', films), 'ydkmn');
    assert.equal(guessFilm('TINO Michael James Mina.mov', films), 'tino');
    assert.equal(guessFilm('Café Noir.mov', films), 'cafe');
    assert.equal(guessFilm('Mirror Dance final.mov', films), 'mirror'); // "The" left out
});

test('the longer title wins when one title sits inside another', () => {
    assert.equal(guessFilm('Take Me Home - final.mov', films), 'takemehome');
    assert.equal(guessFilm('Home.mov', films), 'home');
});

test('no guess when unsure: Salome picks', () => {
    assert.equal(guessFilm('IMG_4821.mov', films), null);
    assert.equal(guessFilm('Run Fast Run Far.mov', films), null); // tiny title inside a longer name
    assert.equal(guessFilm('Dance.mov', [...films, { key: 'd2', title: 'Dance' }, { key: 'd3', title: 'DANCE' }]), null); // two films, same name
});
