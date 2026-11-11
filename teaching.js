"use strict";

window.BUSINESS_UNITS = [...new Set(window.BUSINESS_RULES.map(rule => rule.unit)), "綜合題"];

function businessTopic(question) {
  const stem = question.stem.replace(/\s/g, "");
  const options = question.options.map(option => option.replace(/\s/g, ""));
  let best = null;
  let bestScore = 0;
  for (const rule of window.BUSINESS_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      const weight = Math.min(keyword.length, 7);
      if (stem.includes(keyword)) score += 3 * weight;
      score += options.filter(option => option.includes(keyword)).length * weight;
    }
    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  }
  return best;
}

for (const question of window.QUESTIONS) {
  const topic = businessTopic(question);
  question.unit = topic?.unit || "綜合題";
  question.topic = topic?.concept || "題意與選項判讀";
  question.businessTopic = topic;
}

function getBusinessLesson(question) {
  const authored = window.BUSINESS_LESSONS[question.id];
  if (authored) return authored;

  const topic = question.businessTopic;
  const stem = question.stem.replace(/\s+/g, " ");
  const asksForException = /(?:何者|哪(?:一個|一項|個|項)?|哪些)[^。？?]{0,18}(?:錯誤|不正確|不恰當|不符合|不是|不適合|不能|不包括)|(?:最不|並非|不屬於|不包含|未出現)[^。？?]{0,20}[？?]/.test(stem);
  const steps = [];
  const comparisons = {};
  if (topic) steps.push(topic.explanation);
  if (asksForException) steps.push("題目要找錯誤或不符合條件的一項。先逐項核對，再把例外當作答案。");

  const blocks = (question.official || "").trim()
    .split(/\n(?=\s*(?:[（(][A-D][）)]|[①-⑩]))/);
  for (const block of blocks) {
    const line = block.trim();
    if (!line) continue;
    const labels = line.match(/^(?:[（(][A-D][）)]\s*)+/);
    if (!labels) {
      steps.push(line);
      continue;
    }
    const reason = line.slice(labels[0].length).trim();
    if (!reason) continue;
    for (const letter of labels[0].match(/[A-D]/g)) {
      if (letter === question.answer) steps.push(`看選項 ${letter} 的判斷依據：${reason}`);
      else comparisons[letter] = comparisons[letter] ? comparisons[letter] + "\n" + reason : reason;
    }
  }

  if (Object.keys(comparisons).length) {
    steps.push("先看下面的「選項比對」，找出關鍵詞、數字或分類在哪一步配錯。");
  }
  const choice = question.options["ABCD".indexOf(question.answer)].replace(/\s+/g, " ").trim();
  const quotedChoice = choice && choice.length <= 85 ? `「${choice}」` : "";
  steps.push(`依題目要求，選 ${question.answer}${quotedChoice}。`);
  return {
    concept: topic?.concept || "從題目情境找出判斷線索",
    steps,
    pitfalls: topic?.example,
    distractors: comparisons,
  };
}
