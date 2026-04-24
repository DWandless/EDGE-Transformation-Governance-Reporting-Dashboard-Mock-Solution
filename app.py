import streamlit as st
import pandas as pd

st.set_page_config(page_title="EDGE Governance & Reporting Dashboard", layout="wide")

st.title("EDGE Governance & Reporting Dashboard")

@st.cache_data
def load_data():
    df = pd.read_csv('assets/EDGE Governance & Reporting Mock Dashboard Mock Data.csv', encoding='utf-8-sig')
    return df

governance_attributes = {
    "Update WBS Code": "Project WBS Field is Empty",
    "Review Schedule Status Indicator": "The reported Schedule RAG is healthier than calculated",
    "Review Financial Status Indicator": "The reported Financial RAG is healthier than the calculated",
    "Review Overall Status Indicator": "The reported Overall RAG is healthier than calculated",
    "Add Active Issue": "The Active Issue Field is empty and the Reported Overall is Red",
    "Update Project Status": "The Reported Overall is non-green and the Go-to-Green Date is in the past or empty",
    "Update Open Milestones In PSA": 'The "Open Milestone Date" field is past the "End Date" Field or is empty',
    "Update Project Stage In PSA": 'The Stage Field has been "In Planning" for 30 days since start date - update Stage to "In Progress"',
    "Update Project Manager In PSA": "The Project Manager Field Is blank and required to contact the PM",
    "Update Milestones In PSA": 'The "Milestone Criteria Met" Field is empty or False',
    "Update Financials In PSA": "Key Financial Fields are missing (Billing Type, Opportunity ID, Client ID, Planned Project Hours Baseline, Planned Hours, Schedule Remaining Hours, Project Currency, Planned Revenue Baseline, Billable)",
    "Update Project Status Report": 'The "project status report submission date" field is empty or is more than a year old'
}

try:
    df = load_data()
    
    st.sidebar.header("Filter by Governance Attributes")
    st.sidebar.markdown("Select attributes to filter projects with issues:")
    
    selected_filters = []
    for attr_name, attr_description in governance_attributes.items():
        if st.sidebar.checkbox(attr_name, help=attr_description):
            selected_filters.append(attr_name)
    
    if selected_filters:
        mask = pd.Series([False] * len(df))
        
        for filter_name in selected_filters:
            if filter_name == "Update WBS Code":
                mask = mask | (df['Project WBS'].isna() | (df['Project WBS'] == ''))
            
            elif filter_name == "Review Schedule Status Indicator":
                rag_order = {'Green': 3, 'Amber': 2, 'Red': 1}
                calc_rag = df['Calculated Schedule RAG'].map(rag_order).fillna(0)
                rep_rag = df['Reported Schedule RAG'].map(rag_order).fillna(0)
                mask = mask | (rep_rag > calc_rag)
            
            elif filter_name == "Review Financial Status Indicator":
                rag_order = {'Green': 3, 'Amber': 2, 'Red': 1}
                calc_rag = df['Calculated Financial RAG'].map(rag_order).fillna(0)
                rep_rag = df['Reported Financial RAG'].map(rag_order).fillna(0)
                mask = mask | (rep_rag > calc_rag)
            
            elif filter_name == "Review Overall Status Indicator":
                rag_order = {'Green': 3, 'Amber': 2, 'Red': 1}
                calc_rag = df['Calculated Overall RAG'].map(rag_order).fillna(0)
                rep_rag = df['Reported Overall RAG'].map(rag_order).fillna(0)
                mask = mask | (rep_rag > calc_rag)
            
            elif filter_name == "Add Active Issue":
                mask = mask | ((df['Active Issue'].isna() | (df['Active Issue'] == '')) & (df['Reported Overall RAG'] == 'Red'))
            
            elif filter_name == "Update Project Status":
                gtg_empty = df['Project GTG Date'].isna() | (df['Project GTG Date'] == '')
                gtg_past = pd.to_datetime(df['Project GTG Date'], errors='coerce') < pd.Timestamp.now()
                non_green = df['Reported Overall RAG'] != 'Green'
                mask = mask | (non_green & (gtg_empty | gtg_past))
            
            elif filter_name == "Update Open Milestones In PSA":
                milestone_empty = df['Open Milestone Date'].isna() | (df['Open Milestone Date'] == '')
                milestone_past = pd.to_datetime(df['Open Milestone Date'], errors='coerce') > pd.to_datetime(df['End Date'], errors='coerce')
                mask = mask | (milestone_empty | milestone_past)
            
            elif filter_name == "Update Project Stage In PSA":
                in_planning = df['Stage'] == 'In Planning'
                start_date = pd.to_datetime(df['Start Date'], errors='coerce')
                days_since_start = (pd.Timestamp.now() - start_date).dt.days
                mask = mask | (in_planning & (days_since_start >= 30))
            
            elif filter_name == "Update Project Manager In PSA":
                mask = mask | (df['Project Manager'].isna() | (df['Project Manager'] == ''))
            
            elif filter_name == "Update Milestones In PSA":
                mask = mask | (df['Milestone Criteria Met'].isna() | (df['Milestone Criteria Met'] == '') | (df['Milestone Criteria Met'] == False))
            
            elif filter_name == "Update Financials In PSA":
                financial_fields = ['Billing Type', 'Opportunity ID', 'Client ID', 'Planned Project Hours Baseline', 
                                  'Planned Hours', 'Schedule Remaining Hours', 'Project Currency', 'Planned Revenue Baseline', 'Billable']
                missing_any = pd.Series([False] * len(df))
                for field in financial_fields:
                    if field in df.columns:
                        missing_any = missing_any | (df[field].isna() | (df[field] == ''))
                mask = mask | missing_any
            
            elif filter_name == "Update Project Status Report":
                report_empty = df['Project Status Report Submission Date'].isna() | (df['Project Status Report Submission Date'] == '')
                report_old = (pd.Timestamp.now() - pd.to_datetime(df['Project Status Report Submission Date'], errors='coerce')).dt.days > 365
                mask = mask | (report_empty | report_old)
        
        filtered_df = df[mask]
        st.info(f"Showing {len(filtered_df)} of {len(df)} projects with selected governance issues")
        st.dataframe(filtered_df, width='content')
    else:
        st.info(f"Showing all {len(df)} projects. Select filters in the sidebar to view projects with specific governance issues.")
        st.dataframe(df, width='content')
        
except Exception as e:
    st.error(f"Error loading data: {e}")
    st.info("Trying alternative encoding...")
    try:
        df = pd.read_csv('assets/EDGE Governance & Reporting Mock Dashboard Mock Data.csv', encoding='latin-1')
        st.dataframe(df, width='content')
    except Exception as e2:
        st.error(f"Failed to load data: {e2}")
