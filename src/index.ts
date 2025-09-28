import { Chord, Note, Distance } from "tonal"
import moji                      from "moji"
const transpose=Distance.transpose as ((note: string, interval: string) => string) & ((note: string) => ((interval: string) => string))

export const translateType = (_type:string) => {
  const notes = [0, 0, 0, null, null, null, null]
  let type = _type
  type = moji(type).convert("ZE", "HE").toString()
  type = type.replace(/ 　/g,    "")
  type = type.replace(/[＃♯]/g,  "#")
  type = type.replace(/[♭ｂ]/g, "b")
  let tension:string[]=[]

  const tensionRegex = /[\(（](.+)[\)）]/g
  const tensionMatches = type.matchAll(tensionRegex)
  for (let tensionMatch of tensionMatches) {
    tension = tension.concat(tensionMatch[1].replace(/[\s　]+/g, "").split(/[,，]/))
  }
  type = type.replace(tensionRegex, "")

  const parseType = (regex:RegExp) => {
    if (type.match(regex)) {
      type = type.replace(regex, "")
      return true
    } else {
      return false
    }
  }
  // base
  switch (true) {
    case parseType(/^M(?!(7|9|11|13|aj))/): break
    case parseType(/^m(?!aj)/): notes[1] = -1; break
  }
  switch (true) {
    case parseType(/aug5?|\+(?!\d)/): notes[2] = 1;  break
    case parseType(/[Φφø]/):          notes[1] = -1; notes[2] = -1; notes[3] = 0; break
  }
  // +-
  switch (true) {
    case parseType(/[\+#]5/): notes[2] = 1;  break
    case parseType(/[-b]5/):  notes[2] = -1; break
  }
  switch (true) {
    case parseType(/^5/):  notes[1] = null; break
    case parseType(/^6/):  notes[3] = -1;   break
    case parseType(/^13/): notes[6] = 0;
    case parseType(/^11/): notes[5] = 0;
    case parseType(/^9/):  notes[4] = 0;
    case parseType(/^7/):  notes[3] = 0;    break
  }
  // sus
  switch (true) {
    case parseType(/sus4/): notes[1] = 1;  break
    case parseType(/sus2/): notes[1] = -2; break
  }
  // add
  switch (true) {
    case parseType(/add2/):  notes[4] = -12; break
    case parseType(/add9/):  notes[4] = 0;   break
    case parseType(/add4/):  notes[5] = -12; break
    case parseType(/add11/): notes[5] = 0;   break
    case parseType(/add6/):  notes[6] = -12; break
    case parseType(/add13/): notes[6] = 0;   break
  }
  // M
  switch (true) {
    case parseType(/(M|[Mm]aj|△|Δ)13/): notes[6] = 0; 
    case parseType(/(M|[Mm]aj|△|Δ)11/): notes[5] = 0; 
    case parseType(/(M|[Mm]aj|△|Δ)9/):  notes[4] = 0; 
    case parseType(/(M|[Mm]aj|△|Δ)7/):  notes[3] = 1; break
  }
  // dim
  switch (true) {
    case parseType(/^(dim|o)7/):  notes[3] = -1; 
    case parseType(/^(dim|o)/):  if(notes[1]!==null)notes[1] -= 1; if(notes[2]!==null)notes[2] -= 1; break
  }
  // tension
  if (tension) type += tension.join("")
  if (parseType(/[\+#]5/))     notes[2] = 1
  if (parseType(/[-b]5/))      notes[2] = -1
  if (parseType(/M7/))         notes[3] = 1
  if (parseType(/7/))          notes[3] = 0
  if (parseType(/[\+#]9/))     notes[4] = 1
  if (parseType(/[-b]9/))      notes[4] = -1
  if (parseType(/9/))          notes[4] = 0
  if (parseType(/[\+#]11/))    notes[5] = 1
  if (parseType(/[-b]11/))     notes[5] = -1
  if (parseType(/11/))         notes[5] = 0
  if (parseType(/[\+#]13/))    notes[6] = 1
  if (parseType(/[-b]13/))     notes[6] = -1
  if (parseType(/13/))         notes[6] = 0
  if (parseType(/(omit|no)1/)) notes[0] = null;
  if (parseType(/(omit|no)3/)) notes[1] = null;
  if (parseType(/(omit|no)5/)) notes[2] = null;
  if (parseType(/(omit|no)7/)) notes[3] = null;
  if (parseType(/(omit|no)9/)) notes[4] = null;
  if (parseType(/(omit|no)11/)) notes[5] = null;
  if (parseType(/(omit|no)13/)) notes[6] = null;

  // 翻訳できない文字列があるか、音がない場合はエラー
  if (type.length > 0 || notes.filter(note => note !== null).length == 0) {
    return false
  }
  return notes
}

const transposer = (note:string, interval:number) => {
  let tmp=Note.midi(note)
  if(tmp===null){
    return false
  }
  return Note.fromMidi(tmp + interval)
}

const buildChord = (root:string, translator:(number|null)[]) => {
  const notes:string[] = []
  const chord13 = Chord.notes(root, "13") // 13コードを基準にして音を足したり減らしたりする
  chord13.splice(5, 0, transpose(root, "M11")) // tonal の 13コードは 11th が omit されている

  for (let i = 0; i < 7; i += 1) {
    let tmp=translator[i]
    if (tmp !== null) {
      let tmp_=transposer(chord13[i], tmp)
      if(tmp_==false){
        return false
      }
      notes.push(tmp_)
    }
  }
  return notes
}

const chord2notes = (root:string, type = "", baseRangeStart = 48) => {
  const translator = translateType(type)
  if (!translator) return false
  let tmp=Note.midi(root)
  if(tmp===null){
    return false
  }
  const notes = buildChord(Note.fromMidi(((tmp-baseRangeStart)%12+12)%12+baseRangeStart), translator)
  return notes
}

export default chord2notes
