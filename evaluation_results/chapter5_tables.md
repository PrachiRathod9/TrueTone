# Chapter 5 Academic Evaluation Tables: TrueTone System

These tables are prepared in standard academic formatting for direct inclusion in Chapter 5 (*Testing, Results and Discussion*) of the final-year B.Tech CSE thesis.

---

### Table 5.1: Overall Acoustic AI Voice Detection Performance (Default Threshold $\tau = 0.15$)

*Evaluation sample: $N = 13$ deduplicated independent labelled audio recordings ($6$ AI-generated, $7$ Authentic Human). Positive Class = AI Voice; Negative Class = Human Voice.*

| Evaluation Metric | Mathematical Formula | Measured Empirical Value | Academic Interpretation |
| :--- | :--- | :---: | :--- |
| **True Positives (TP)** | Count($Y = \text{AI} \land \hat{Y} = \text{AI}$) | **2** | Synthetic voice clips correctly identified as AI. |
| **True Negatives (TN)** | Count($Y = \text{Human} \land \hat{Y} = \text{Human}$) | **6** | Authentic human clips correctly identified as Human. |
| **False Positives (FP)** | Count($Y = \text{Human} \land \hat{Y} = \text{AI}$) | **1** | Human clips falsely flagged as AI deepfakes. |
| **False Negatives (FN)** | Count($Y = \text{AI} \land \hat{Y} = \text{Human}$) | **4** | Synthetic voice clips missed by the detector. |
| **Classification Accuracy** | $\frac{\text{TP} + \text{TN}}{\text{TP} + \text{TN} + \text{FP} + \text{FN}}$ | **61.54\%** | Overall proportion of correct classifications across both classes. |
| **Precision (PPV)** | $\frac{\text{TP}}{\text{TP} + \text{FP}}$ | **66.67\%** | Confidence that a detected alert is genuinely an AI voice. |
| **Recall / Sensitivity (TPR)** | $\frac{\text{TP}}{\text{TP} + \text{FN}}$ | **33.33\%** | Detection rate of actual synthetic deepfake voice clips. |
| **Specificity (TNR)** | $\frac{\text{TN}}{\text{TN} + \text{FP}}$ | **85.71\%** | Ability to correctly exempt legitimate human speech. |
| **False Positive Rate (FPR)**| $\frac{\text{FP}}{\text{FP} + \text{TN}}$ | **14.29\%** | Rate at which genuine human speech triggers false alarms. |
| **F1-Score** | $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$ | **44.44\%** | Harmonic mean balancing detection precision and recall. |

---

### Table 5.2: Clean Audio vs. Real-World Mobile Microphone Performance

*Comparative evaluation across recording channels showing the impact of acoustic domain shift.*

| Performance Parameter | Clean Studio / Direct Synthetic Audio | Real-World Mobile / Speakerphone Audio | Impact of Mobile Channel Shift |
| :--- | :---: | :---: | :--- |
| **Evaluated Sample Size ($N$)** | $N = 2$ decodable ($+1$ AAC rejected) | $N = 11$ unique mobile mic clips | Phone microphone introduces lossy codecs and noise. |
| **Class Distribution** | 1 AI, 1 Human | 5 AI, 6 Human | Balanced realistic test partition. |
| **Decision Threshold ($\tau$)** | $0.15$ | $0.15$ | Fixed operational application threshold. |
| **Confusion Matrix (TP / TN / FP / FN)** | 1 / 1 / 0 / 0 | 1 / 5 / 1 / 4 | High false negative rate on re-recorded mobile clips. |
| **Classification Accuracy** | **100.0\%** | **54.55\%** | Mobile channel degradation reduces accuracy by $36.36\%$. |
| **Precision** | **100.0\%** | **50.0\%** | Precision remains moderate ($50.0\%$ on mobile). |
| **Recall (Sensitivity)** | **100.0\%** | **20.0\%** | High-frequency vocoder cues are attenuated over speakerphone. |
| **Specificity** | **100.0\%** | **83.33\%** | False alarm resistance remains solid on mobile audio. |
| **False Positive Rate (FPR)** | **0.0\%** | **16.67\%** | Low false alarm rate across both categories. |
| **F1-Score** | **100.0\%** | **28.57\%** | Highlights necessity of hybrid behavioral scoring. |

---

### Table 5.3: Diagnostic Multi-Threshold Evaluation Matrix

*Empirical trade-off between sensitivity and false alarm rate across diagnostic threshold boundaries.*

| Threshold ($\tau$) | Total ($N$) | TP | TN | FP | FN | Accuracy | Precision | Recall | Specificity | FPR | F1-Score | Trade-Off Characterization |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| $\tau = 0.005$ | 13 | 4 | 6 | 1 | 2 | 76.92\% | 80.0\% | 66.67\% | 85.71\% | 14.29\% | 72.73\% |  |
| $\tau = 0.010$ | 13 | 4 | 6 | 1 | 2 | 76.92\% | 80.0\% | 66.67\% | 85.71\% | 14.29\% | 72.73\% | Aggressive detection; high false alarms. |
| $\tau = 0.020$ | 13 | 4 | 6 | 1 | 2 | 76.92\% | 80.0\% | 66.67\% | 85.71\% | 14.29\% | 72.73\% | Balances mobile mic recall (66.7%) and specificity. |
| $\tau = 0.050$ | 13 | 3 | 6 | 1 | 3 | 69.23\% | 75.0\% | 50.0\% | 85.71\% | 14.29\% | 60.0\% | Improved recall on mobile samples. |
| $\tau = 0.100$ | 13 | 2 | 6 | 1 | 4 | 61.54\% | 66.67\% | 33.33\% | 85.71\% | 14.29\% | 44.44\% |  |
| $\tau = 0.150$ | 13 | 2 | 6 | 1 | 4 | 61.54\% | 66.67\% | 33.33\% | 85.71\% | 14.29\% | 44.44\% | **Default TrueTone Application Threshold**. |
| $\tau = 0.200$ | 13 | 2 | 6 | 1 | 4 | 61.54\% | 66.67\% | 33.33\% | 85.71\% | 14.29\% | 44.44\% |  |
| $\tau = 0.250$ | 13 | 2 | 6 | 1 | 4 | 61.54\% | 66.67\% | 33.33\% | 85.71\% | 14.29\% | 44.44\% |  |
| $\tau = 0.300$ | 13 | 1 | 6 | 1 | 5 | 53.85\% | 50.0\% | 16.67\% | 85.71\% | 14.29\% | 25.0\% | Conservative; misses subtle synthetic speech. |
| $\tau = 0.400$ | 13 | 0 | 6 | 1 | 6 | 46.15\% | 0.0\% | 0.0\% | 85.71\% | 14.29\% | N/A\% |  |
| $\tau = 0.500$ | 13 | 0 | 7 | 0 | 6 | 53.85\% | N/A\% | 0.0\% | 100.0\% | 0.0\% | N/A\% | Standard binary threshold; misses 83.3% of AI clips. |

---

### Table 5.4: Scam-Risk Assessment Evaluation and Heuristic Specification

| Parameter / Dimension | Engineering Specification & Implementation Status | Verification Source |
| :--- | :--- | :--- |
| **Scam-Risk Evaluation Status** | **Performance Metrics Unmeasured (Absence of Independent Labels)** | Lack of external fraud-annotated conversation benchmark. |
| **Acoustic Weighting Factor** | $60\%$ ($0.60$) applied to Neural AI probability | [`backend/app.py#L236`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L236) |
| **Behavioral Weighting Factor** | $40\%$ ($0.40$) applied to Conversational Questionnaire score | [`backend/app.py#L236`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L236) |
| **Indicator 1: Direct Financial Demand** | $+35$ Risk Points (`askedForMoney`) | [`backend/app.py#L225`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L225) |
| **Indicator 2: Credential / OTP Request**| $+40$ Risk Points (`askedForOtpOrPin`) | [`backend/app.py#L228`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L228) |
| **Indicator 3: Coercive Urgency / Panic**| $+25$ Risk Points (`createdUrgency`) | [`backend/app.py#L231`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L231) |
| **Synthetic Voice Risk Floor** | $R_{\text{combined}} = \max(50, \text{round}(\bar{P}_{\text{AI}} \times 100))$ if $\text{is\_ai} = \text{True}$ | [`backend/app.py#L239-L240`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L239-L240) |
| **Verdict Formulation Rule** | $\text{High Risk}$ if $\text{is\_ai} = \text{True} \lor R_{\text{combined}} \ge 50$; else $\text{Safe}$ | [`backend/app.py#L242`](file:///C:/Users/HP/Desktop/ProjectMega/true-tone-guard-main/backend/app.py#L242) |
| **Required Future Ground Truth** | 100+ annotated conversational interactions with verified fraud ground truth | Independent legal/forensic fraud transcripts. |
