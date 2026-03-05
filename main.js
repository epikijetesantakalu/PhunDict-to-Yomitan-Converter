import { Dictionary, DictionaryIndex, KanjiEntry, TermEntry } from 'yomichan-dict-builder';
import { execSync } from 'child_process';

const phunDictURL = "https://kaeru2193.github.io/Phun-Resources/dict/phun-dict.json";
const charaDictURL = "https://kaeru2193.github.io/Phun-Resources/dict/phun-chara.json";

async function getDictData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error(error.message);
    }
}

const dictData = await getDictData(phunDictURL);

const dictionary = new Dictionary({
    fileName: "PhunDict.zip"
});

const index = new DictionaryIndex()
    .setTitle("PhunDict")
    .setRevision("1.0.3")
    .setAuthor(dictData.author)
    .setDescription("かえるさんの雰和辞典をyomitan形式に変換したもの")
    .setAttribution("CC BY-NC 4.0")
    .setUrl("https://github.com/epikijetesantakalu/PhunDict-for-Yomitan")
    .setIndexUrl("https://github.com/epikijetesantakalu/PhunDict-for-Yomitan/releases/latest/download/index.json")
    .setDownloadUrl("https://github.com/epikijetesantakalu/PhunDict-for-Yomitan/releases/latest/download/PhunDict.zip")
    .setIsUpdatable(true)
    .build();

await dictionary.setIndex(index, "./dictionary", "index.json");

dictionary.addTag({
    name: '漢字転写',
    category: 'misc',
    sortingOrder: -5,
    notes: '漢字転写',
    popularityScore: 0,
});

dictionary.addTag({
    name: '画数',
    category: 'misc',
    sortingOrder: -5,
    notes: '画数',
    popularityScore: 0,
});

for (let i = 0; i < dictData.data.length; i++) {
    for (let j = 0; j < dictData.data[i].mean.length; j++) {
        for (let k = 0; k < dictData.data[i].mean[j].explanation.length; k++) {
            const detailedDefinition = {
                type: "structured-content",
                content: {
                    tag: "div",
                    content: [
                        { tag: "span", content: dictData.data[i].mean[j].type, data: { partOfSpeech: dictData.data[i].mean[j].type } },
                        { tag: "span", content: dictData.data[i].mean[j].explanation[k].translate },
                        { tag: "div", content: dictData.data[i].mean[j].explanation[k].meaning, data: { longExplanation: "true" } }
                    ]
                }
            }

            const entry = new TermEntry(dictData.data[i].word)
                .setReading(dictData.data[i].pron.split(" ").join(""))
                .addDetailedDefinition(detailedDefinition)
                .build();

            await dictionary.addTerm(entry);
        }
    }
    generateAudioFile(dictData.data[i].pron.split(" ").join(""));
}

function generateAudioFile(word) {
    const pronunciation = word
            .replace(/\d/g, '$& ')
            .replace(/([snm(ng)])([123])\s(y?[aiueo])/g, (_, p1, p2, p3) => `${p1}${p2} ${p1}${p3}`) //母音の連音
            .replace(/l([123])\s(y?[aiueo])/g, (_, p1, p2) => `ll${p1} l${p2}`) //dark Lにはならない
            .replace(/s([123])\s([xqj])/g, (_, p1, p2) => `x${p1} ${p2}`) //x, q, jの連音
            .replace(/s([123])\sz/g, (_, p1) => `z${p1} z`) //zの連音
            .split(" ").join("");

    execSync(`espeak-ng -vphn ${pronunciation} -w ../phun-audios/wav/${word}.wav`);
    execSync(`ffmpeg -i ../phun-audios/wav/${word}.wav ../phun-audios/mp3/${word}.mp3 -y`);
}

const charaData = await getDictData(charaDictURL);

for (let i = 0; i < charaData.length; i++) {
    const chara = new KanjiEntry(charaData[i].chara)
        .setOnyomi(charaData[i].langs.pn.pron)
        .addMeaning(charaData[i].langs.pn.mean)
        .setStats({
            "画数": String(charaData[i].strokes),
            "漢字転写": charaData[i].chara
        })
        .build();

    dictionary.addKanji(chara);
}

await dictionary.addFile('./styles.css', 'styles.css');

await dictionary.export("./dictionary");