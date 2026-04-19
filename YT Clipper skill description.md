## **🧠 Skill Name**

**YouTube Highlight Clipper**

---

## **⚙️ Skill Purpose**

The YouTube Highlight Clipper is designed to transform long-form YouTube content (e.g., podcasts, interviews, lectures) into short, high-impact clips optimized for vertical platforms such as TikTok, Instagram Reels, and YouTube Shorts.

It analyzes transcripts to identify high-retention moments, extracts precise timestamps, and prepares structured outputs for automated video clipping and post-processing.

---

## **🎯 Core Objective**

Convert long-form video content into multiple short-form clips that:

* Capture attention within the first 1–3 seconds  
* Deliver a complete, self-contained idea  
* Emphasize emotional, controversial, or insight-driven moments  
* Are suitable for short-form content consumption

---

## **🧩 Inputs**

The skill expects:

* A full transcript of a YouTube video (timestamped or structured text)  
* Optional metadata:  
  * Video title  
  * Topic or niche  
  * Target audience

---

## **📤 Outputs**

The skill must return structured JSON containing:

{  
 "clips": \[  
   {  
     "title": "Short descriptive title",  
     "start": 123,  
     "end": 138,  
     "hook": "Compelling opening line",  
     "reason": "Why this clip works for retention"  
   }  
 \]  
}  
---

## **📏 Clip Constraints**

* Each clip must be **10–25 seconds long** (ideal: \~15 seconds)  
* Must include a **strong hook within the first sentence**  
* Must be **contextually complete** (no missing setup)  
* Avoid clips that rely heavily on previous context

---

## **🧠 Selection Criteria**

The skill should prioritize clips that include:

### **1\. Strong Hooks**

* Bold statements  
* Surprising claims  
* Contrarian opinions

### **2\. Emotional Peaks**

* Passion, frustration, excitement  
* Personal stories or turning points

### **3\. Insight Density**

* Clear, valuable takeaways  
* Advice or frameworks

### **4\. Controversy / Tension**

* Disagreement  
* Challenging common beliefs

---

## **🚫 Avoid**

* Long explanations without payoff  
* Low-energy or filler dialogue  
* Segments requiring prior context  
* Generic or obvious statements

---

## **✍️ Hook Optimization**

For each clip:

* Extract or rewrite the first line to maximize engagement  
* Make it:  
  * Direct  
  * Clear  
  * Emotionally charged

Example:

* Original: “I think consistency is important”  
* Optimized: “Most people fail because they’re not consistent”

---

## **🧠 Reasoning Requirement**

Each clip must include a short explanation of:

* Why it would perform well  
* What makes it engaging

This ensures the system demonstrates **intent, not just extraction**

---

## **⚙️ Downstream Compatibility**

The output must be:

* Machine-readable (strict JSON)  
* Compatible with:  
  * FFmpeg for clipping  
  * Remotion for rendering

---

## **🔁 Workflow Role**

This skill sits between:

Transcript extraction → Video clipping → Motion rendering

It acts as the **decision engine** that determines what content is worth turning into short-form media.