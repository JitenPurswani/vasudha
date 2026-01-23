# Documentation Index – Vasudha

## Quick Navigation

### 📋 **Setup & Getting Started**
- [Complete Setup Guide](setup_guide.md) - Step-by-step setup for all agents and services
- [Agents Overview & Directory](agents_overview.md) - Complete reference for all 8 agents
- [Integration Guide](integration_guide.md) - How agents interact and system architecture
- [API Reference](api_reference.md) - Complete endpoint documentation with examples

### 🏗️ **Architecture & Design**
- [Orchestrator Design](architecture/orchestrator_design.md) - Core decision-making logic & agronomic engine
- [Recommendation Agent Design](architecture/recommendation_agent_design.md) - ML inference with SHAP explanations
- [Market Agent Design](architecture/market_agent_design.md) - Economic intelligence & price analysis
- [XAI Agent Design](architecture/xai_agent_design.md) - Explainability layer & rule-based explanations

### 📊 **Evaluation & Testing**
- [Test Case Analysis](evaluation/test_case_analysis.md) - Validation results across regions and seasons
- [Orchestrator Refinement (Jan 2-3)](progress_report/orchestrator_refinement_jan_2_3.md) - Recent improvements and fixes

### ⚠️ **Limitations & Roadmap**
- [Limitations & Future Work](limitations_and_future_work.md) - Known issues, constraints, and planned features

---

## Document Overview

This folder contains comprehensive technical documentation for the **Vasudha decision-support system**:

### What Each Document Covers

| Document | Purpose | Audience |
|----------|---------|----------|
| **Setup Guide** | Installation and configuration of all agents | Developers, DevOps |
| **Integration Guide** | Data flow, dependencies, and system architecture | Architects, Backend developers |
| **API Reference** | Complete endpoint specifications with examples | Frontend developers, API consumers |
| **Orchestrator Design** | Decision pipeline and agronomic constraint logic | Data scientists, Backend developers |
| **Recommendation Agent Design** | ML model architecture and SHAP integration | ML engineers |
| **Market Agent Design** | Price analysis methodology and scoring logic | Economists, Backend developers |
| **XAI Agent Design** | Explanation generation and rule-based logic | Data scientists, Frontend developers |
| **Test Case Analysis** | Validation methodology and regional testing results | QA, Product managers |
| **Limitations & Future Work** | Known constraints and improvement roadmap | All stakeholders |

---

## Getting Started

### For New Developers
1. Start with [Setup Guide](setup_guide.md) to get agents running locally
2. Review [Integration Guide](integration_guide.md) to understand system flow
3. Consult [API Reference](api_reference.md) for endpoint details

### For System Design Review
1. Read [Orchestrator Design](architecture/orchestrator_design.md) for decision logic
2. Review [Recommendation Agent Design](architecture/recommendation_agent_design.md) for ML pipeline
3. Check [Integration Guide](integration_guide.md) for end-to-end flow

### For Feature Development
1. Identify which agent needs changes ([Architecture docs](architecture/))
2. Review [Integration Guide](integration_guide.md) for impact analysis
3. Check [Test Case Analysis](evaluation/test_case_analysis.md) for testing patterns
4. Update relevant design document

---

## Project Status

All core agents are fully implemented and integrated:

✅ **Recommendation Agent** - XGBoost ML inference with SHAP  
✅ **Weather Agent** - Historical rainfall & temperature data  
✅ **Soil Agent** - District-level soil chemistry  
✅ **Market Agent** - Economic viability scoring (large dataset)  
✅ **Sustainability Agent** - Environmental impact advisory  
✅ **XAI Agent** - Rule-based explanations  
✅ **Climate Adaptation Agent** - Post-planting risk detection  
✅ **Orchestrator** - Central decision-making pipeline  

### Current Focus
- Production deployment readiness
- Performance optimization
- Extended testing in new regions
- Frontend integration planning
