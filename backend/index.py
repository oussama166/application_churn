from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

try:
    import matplotlib.pyplot as plt
    import seaborn as sns

    _PLOTTING = True
except ImportError:
    _PLOTTING = False


# --- Config ---
CSV_PATH = Path(__file__).resolve().parent / "churn_dataset_synthetic_v1(1).csv"
TARGET = "churn_within_90d"
RANDOM_STATE = 42

# Columns to drop: identifiers, dates, post-hoc/outputs, potential leakage
DROP_COLS = [
    "customer_id",
    "snapshot_date",
    "activation_date",
    "primary_churn_driver",
    "recommended_action",
    "churn_risk_score",
    "risk_segment",
    "revenue_at_risk_90d",
    "priority_score",
]

CATEGORICAL = ["gender", "region", "offer_type", "contract_type"]

# Risk segments (churn probability thresholds) — CRM-ready
RISK_SEGMENT_BINS = (0.0, 0.25, 0.5, 1.0)
RISK_SEGMENT_LABELS = ("Low", "Medium", "High")


def feature_engineering(X: pd.DataFrame) -> pd.DataFrame:
    """
    Add behaviour-indicating features (rules: usage, billing, contract, network, SAV).
    Aligns with CRM / contract / billing / usage / network / relation client.
    """
    X = X.copy()
    # Billing
    fee = X["monthly_fee"].replace(0, np.nan)
    X["bill_to_fee_ratio"] = (X["last_bill_amount"] / fee).fillna(1.0)
    X["has_late_payments"] = (X["late_payments_6m"] > 0).astype(int)
    X["has_unpaid"] = (X["unpaid_invoices"] > 0).astype(int)
    # Usage
    X["usage_declining"] = (X["usage_trend_3m"] < 0).astype(int)
    voice = X["voice_minutes"].replace(0, np.nan)
    X["data_per_voice"] = (X["data_gb"] / (voice / 60 + 1e-6)).fillna(0.0)
    # Contract
    m = X["months_to_contract_end"]
    X["is_contract_ending_soon"] = ((m >= 0) & (m <= 3)).astype(int)
    # SAV / relation client
    X["tickets_unclosed"] = X["tickets_opened_3m"] - X["tickets_closed_3m"]
    X["total_sav_contacts"] = (
        X["support_calls_3m"]
        + X["billing_contacts"]
        + X["tech_contacts"]
        + X["commercial_contacts"]
    )
    closed = X["tickets_closed_3m"] + 1
    X["resolution_per_ticket"] = X["avg_resolution_time_hours"] / closed
    # Network & qualité
    X["network_stress"] = X["network_incidents_3m"] + X["tech_complaints_3m"]
    return X


def load_data(path: Path | str = CSV_PATH) -> tuple[pd.DataFrame, pd.Series]:
    """Load CSV, separate features and target."""
    path = Path(path)
    df = pd.read_csv(path)

    if TARGET not in df.columns:
        raise ValueError(f"Target column '{TARGET}' not found. Columns: {list(df.columns)}")

    y = df[TARGET].copy()
    X = df.drop(columns=[TARGET] + [c for c in DROP_COLS if c in df.columns])

    return X, y


def _infer_numeric_categorical(X: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Numeric vs categorical based on dtypes and CATEGORICAL list."""
    cat = [c for c in CATEGORICAL if c in X.columns]
    num = [c for c in X.select_dtypes(include=[np.number]).columns if c not in cat]
    return num, cat


def distribution_summary(
    X: pd.DataFrame,
    num_cols: list[str],
    cat_cols: list[str],
) -> tuple[pd.DataFrame, dict[str, pd.Series]]:
    """
    Compute distribution summary for numeric and categorical features.
    Returns (numeric_stats_df, categorical_value_counts_dict).
    """
    numeric_stats = (
        X[num_cols].describe(percentiles=[0.25, 0.5, 0.75]).T
        if num_cols
        else pd.DataFrame()
    )
    cat_counts = {c: X[c].value_counts(dropna=False) for c in cat_cols if c in X.columns}
    return numeric_stats, cat_counts


def correlation_matrix(X: pd.DataFrame, num_cols: list[str]) -> pd.DataFrame:
    """Pearson correlation matrix of numeric features."""
    if not num_cols:
        return pd.DataFrame()
    return X[num_cols].corr()


def drop_redundant_by_correlation(
    X: pd.DataFrame,
    num_cols: list[str],
    threshold: float = 0.92,
) -> list[str]:
    """
    Drop one feature from each highly correlated pair (|r| > threshold).
    Keeps the first in pair order; prefers keeping raw over derived when one is substring of other.
    Returns list of num_cols to keep.
    """
    corr = X[num_cols].corr()
    to_drop: set[str] = set()
    upper = corr.where(np.triu(np.ones_like(corr, dtype=bool), k=1))
    for col in upper.columns:
        if col in to_drop:
            continue
        for row, v in upper[col].items():
            if pd.isna(v) or abs(v) < threshold:
                continue
            if row in to_drop:
                continue
            # Keep one, drop the other: prefer shorter name (often raw) or alphabetically first
            keep, drop = (col, row) if col < row else (row, col)
            if len(col) != len(row):
                keep, drop = (col, row) if len(col) < len(row) else (row, col)
            to_drop.add(drop)
    return [c for c in num_cols if c not in to_drop]


def top_correlated_pairs(
    corr: pd.DataFrame,
    n: int = 15,
    min_abs: float = 0.0,
) -> list[tuple[str, str, float]]:
    """Return top |correlation| pairs (excluding self), as (col_a, col_b, r)."""
    out: list[tuple[str, str, float]] = []
    upper = corr.where(np.triu(np.ones_like(corr, dtype=bool), k=1))
    for col in upper.columns:
        s = upper[col].dropna()
        s = s[s.abs() >= min_abs].sort_values(key=lambda x: x.abs(), ascending=False)
        for row, v in s.items():
            out.append((col, row, float(v)))
    out.sort(key=lambda x: abs(x[2]), reverse=True)
    return out[:n]


def plot_distributions(
    X: pd.DataFrame,
    num_cols: list[str],
    cat_cols: list[str],
    save_dir: Path | str | None = None,
    num_cols_per_row: int = 4,
) -> None:
    """Plot histograms for numeric and bar charts for categorical features."""
    if not _PLOTTING:
        return
    save_dir = Path(save_dir) if save_dir else Path("analysis")
    save_dir.mkdir(parents=True, exist_ok=True)
    n_num = len(num_cols)
    n_cat = len([c for c in cat_cols if c in X.columns])
    if n_num:
        nrows = (n_num + num_cols_per_row - 1) // num_cols_per_row
        fig, axes = plt.subplots(nrows, num_cols_per_row, figsize=(4 * num_cols_per_row, 3 * nrows))
        axes = np.atleast_2d(axes)
        for idx, col in enumerate(num_cols):
            r, c = idx // num_cols_per_row, idx % num_cols_per_row
            ax = axes[r, c]
            ax.hist(X[col].dropna(), bins=min(50, max(10, int(X[col].nunique()))), edgecolor="black", alpha=0.7)
            ax.set_title(col, fontsize=9)
            ax.tick_params(axis="both", labelsize=7)
        for idx in range(n_num, axes.size):
            r, c = idx // num_cols_per_row, idx % num_cols_per_row
            axes[r, c].set_visible(False)
        fig.suptitle("Numeric feature distributions", fontsize=12)
        fig.tight_layout()
        fig.savefig(save_dir / "distributions_numeric.png", dpi=120, bbox_inches="tight")
        plt.close(fig)
    if n_cat:
        fig2, axes2 = plt.subplots(2, 2, figsize=(10, 8))
        axes2 = axes2.ravel()
        for idx, col in enumerate(cat_cols):
            if col not in X.columns or idx >= len(axes2):
                continue
            counts = X[col].value_counts(dropna=False)
            axes2[idx].bar(range(len(counts)), counts.values, tick_label=counts.index.astype(str), edgecolor="black")
            axes2[idx].set_title(col, fontsize=10)
            axes2[idx].tick_params(axis="x", rotation=45, labelsize=8)
        for idx in range(n_cat, len(axes2)):
            axes2[idx].set_visible(False)
        fig2.suptitle("Categorical feature distributions", fontsize=12)
        fig2.tight_layout()
        fig2.savefig(save_dir / "distributions_categorical.png", dpi=120, bbox_inches="tight")
        plt.close(fig2)


def plot_correlation(
    corr: pd.DataFrame,
    save_dir: Path | str | None = None,
) -> None:
    """Plot correlation matrix heatmap."""
    if not _PLOTTING or corr.empty:
        return
    save_dir = Path(save_dir) if save_dir else Path("analysis")
    save_dir.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(14, 12))
    mask = np.triu(np.ones_like(corr, dtype=bool), k=1)
    sns.heatmap(corr, mask=mask, center=0, cmap="RdBu_r", ax=ax, square=True, annot=False)
    ax.set_title("Feature correlation (numeric)")
    fig.savefig(save_dir / "correlation.png", dpi=120, bbox_inches="tight")
    plt.close(fig)


def build_preprocessor(num_cols: list[str], cat_cols: list[str]) -> ColumnTransformer:
    """Build ColumnTransformer for numeric + categorical preprocessing."""
    return ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline([
                    ("impute", SimpleImputer(strategy="median")),
                    ("scale", StandardScaler()),
                ]),
                num_cols,
            ),
            (
                "cat",
                Pipeline([
                    ("impute", SimpleImputer(strategy="most_frequent")),
                    ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                ]),
                cat_cols,
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def transform(X: pd.DataFrame, preprocessor: ColumnTransformer) -> np.ndarray:
    """Transform raw X to ML-ready array."""
    return preprocessor.transform(X)


def get_feature_names(preprocessor: ColumnTransformer, num_cols: list[str], cat_cols: list[str]) -> list[str]:
    """Feature names after preprocessing (numeric + one-hot expansion)."""
    out = list(num_cols)
    ct = preprocessor.named_transformers_["cat"]
    enc = ct.named_steps["onehot"]
    out.extend(enc.get_feature_names_out(cat_cols))
    return out


def run_pipeline(
    path: Path | str = CSV_PATH,
    fit: bool = True,
    preprocessor: ColumnTransformer | None = None,
    apply_fe: bool = True,
    selected_num_cols: list[str] | None = None,
    selected_cat_cols: list[str] | None = None,
    drop_redundant: bool = False,
    redundancy_threshold: float = 0.92,
) -> tuple[np.ndarray, np.ndarray, ColumnTransformer, list[str], pd.DataFrame]:
    """
    Load data, optional feature engineering, optionally fit preprocessor, transform X.
    If selected_num_cols/selected_cat_cols provided, use only those. Else if drop_redundant,
    drop highly correlated numeric pairs. Returns (X_processed, y, preprocessor, feature_names, X_fe).
    """
    X, y = load_data(path)
    if apply_fe:
        X = feature_engineering(X)
    num_cols, cat_cols = _infer_numeric_categorical(X)

    if selected_num_cols is not None:
        num_cols = [c for c in num_cols if c in selected_num_cols]
    elif drop_redundant:
        num_cols = drop_redundant_by_correlation(X, num_cols, threshold=redundancy_threshold)

    if selected_cat_cols is not None:
        cat_cols = [c for c in cat_cols if c in selected_cat_cols]

    if preprocessor is None:
        preprocessor = build_preprocessor(num_cols, cat_cols)

    if fit:
        preprocessor = preprocessor.fit(X)

    X_processed = transform(X, preprocessor)
    y_arr = np.asarray(y, dtype=np.intp)
    names = get_feature_names(preprocessor, num_cols, cat_cols)

    return X_processed, y_arr, preprocessor, names, X


def select_features_by_importance(
    X_processed: np.ndarray,
    y: np.ndarray,
    feature_names: list[str],
    num_cols: list[str],
    cat_cols: list[str],
    top_n: int = 30,
    scale_pos_weight: float | None = None,
    random_state: int = RANDOM_STATE,
) -> tuple[list[str], list[str], list[tuple[str, float]]]:
    """
    Train XGBoost, compute feature importance, select top input columns.
    Maps one-hot columns back to their categorical parent; sums importance per input col.
    Returns (selected_num_cols, selected_cat_cols, ranked_input_cols).
    """
    import xgboost as xgb

    if scale_pos_weight is None:
        n_pos = max(1, int(y.sum()))
        n_neg = len(y) - n_pos
        scale_pos_weight = n_neg / n_pos

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=scale_pos_weight,
        random_state=random_state,
    )
    model.fit(X_processed, y, verbose=False)

    imp = model.feature_importances_
    # Map processed feature -> input column (one-hot names are "col_value", e.g. offer_type_Basic)
    input_col_importance: dict[str, float] = {}
    for name, score in zip(feature_names, imp):
        if name in num_cols:
            input_col = name
        else:
            # Find longest cat_col that is a prefix of name
            input_col = name
            for c in cat_cols:
                if name.startswith(c + "_"):
                    input_col = c
                    break
        input_col_importance[input_col] = input_col_importance.get(input_col, 0.0) + score

    ranked = sorted(input_col_importance.items(), key=lambda x: x[1], reverse=True)
    selected = {c for c, _ in ranked[:top_n]}
    sel_num = [c for c in num_cols if c in selected]
    sel_cat = [c for c in cat_cols if c in selected]
    return sel_num, sel_cat, ranked


def _risk_segment(proba: np.ndarray, bins: tuple = RISK_SEGMENT_BINS, labels: tuple = RISK_SEGMENT_LABELS) -> np.ndarray:
    """Map churn probabilities to CRM-ready risk segments (Low / Medium / High)."""
    return pd.cut(proba, bins=bins, labels=labels, include_lowest=True).astype(str)


def train_xgboost(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    *,
    scale_pos_weight: float | None = None,
    random_state: int = RANDOM_STATE,
    early_stopping_rounds: int = 50,
) -> tuple["xgb.XGBClassifier", dict]:
    """
    Train XGBoost for churn (binary classification, class imbalance).
    Returns (fitted model, metrics dict).
    """
    import xgboost as xgb
    from sklearn.metrics import accuracy_score, auc, classification_report, f1_score, precision_recall_curve
    from sklearn.metrics import roc_auc_score

    if scale_pos_weight is None:
        n_pos = max(1, int(y_train.sum()))
        n_neg = len(y_train) - n_pos
        scale_pos_weight = n_neg / n_pos

    m = xgb.XGBClassifier(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        random_state=random_state,
        eval_metric="aucpr",
        early_stopping_rounds=early_stopping_rounds,
    )
    m.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_pred = m.predict(X_test)
    y_proba = m.predict_proba(X_test)[:, 1]
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "roc_auc": float(roc_auc_score(y_test, y_proba)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "classification_report": classification_report(y_test, y_pred, zero_division=0),
    }
    precision, recall, _ = precision_recall_curve(y_test, y_proba)
    metrics["pr_auc"] = float(auc(recall, precision))
    return m, metrics


def save_churn_artifacts(
    model: object,
    preprocessor: ColumnTransformer,
    feature_names: list[str],
    path_dir: Path | str = "artifacts",
    selected_cols: list[str] | None = None,
) -> None:
    """Persist model and preprocessor for batch scoring."""
    import joblib

    path_dir = Path(path_dir)
    path_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path_dir / "churn_xgb.joblib")
    meta = {"preprocessor": preprocessor, "feature_names": feature_names}
    if selected_cols is not None:
        meta["selected_cols"] = selected_cols
    joblib.dump(meta, path_dir / "churn_preprocessor.joblib")


def load_churn_artifacts(path_dir: Path | str = "artifacts") -> tuple[object, ColumnTransformer, list[str]]:
    """Load model and preprocessor for batch scoring."""
    import joblib

    path_dir = Path(path_dir)
    model = joblib.load(path_dir / "churn_xgb.joblib")
    meta = joblib.load(path_dir / "churn_preprocessor.joblib")
    return model, meta["preprocessor"], meta["feature_names"]


def run_pipeline_with_selection(
    path: Path | str = CSV_PATH,
    top_n: int = 30,
    redundancy_threshold: float = 0.92,
    random_state: int = RANDOM_STATE,
) -> tuple[object, ColumnTransformer, list[str], list[str], dict, list[tuple[str, float]]]:
    """
    Full flow: correlation drop -> importance-based selection -> train on selected features.
    Returns (model, preprocessor, feature_names, selected_cols, metrics, importance_ranked).
    """
    X, y = load_data(path)
    X = feature_engineering(X)
    num_cols, cat_cols = _infer_numeric_categorical(X)

    # Step 1: drop redundant by correlation
    num_cols = drop_redundant_by_correlation(X, num_cols, threshold=redundancy_threshold)

    # Step 2: full pipeline on reduced set
    X_processed, y_arr, preprocessor, feature_names, _ = run_pipeline(
        path=path, fit=True, preprocessor=None, apply_fe=True,
        selected_num_cols=num_cols, selected_cat_cols=cat_cols,
    )

    # Step 3: importance-based selection
    sel_num, sel_cat, ranked = select_features_by_importance(
        X_processed, y_arr, feature_names, num_cols, cat_cols,
        top_n=top_n, random_state=random_state,
    )
    selected_cols = sel_num + sel_cat

    # Step 4: rebuild and retrain on selected only
    X_processed, y_arr, preprocessor, feature_names, _ = run_pipeline(
        path=path, fit=True, preprocessor=None, apply_fe=True,
        selected_num_cols=sel_num, selected_cat_cols=sel_cat,
    )

    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(
        X_processed, y_arr, test_size=0.2, random_state=random_state, stratify=y_arr
    )
    model, metrics = train_xgboost(X_train, y_train, X_test, y_test, random_state=random_state)

    return model, preprocessor, feature_names, selected_cols, metrics, ranked


def prepare_upload_for_scoring(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series | None]:
    """
    Prepare raw upload DataFrame for scoring. Drops TARGET and DROP_COLS.
    Returns (X_features, customer_refs or None). customer_refs from customer_id if present.
    """
    df = df.copy()
    customer_refs = df["customer_id"].astype(str) if "customer_id" in df.columns else None
    to_drop = [TARGET] + DROP_COLS
    to_drop = [c for c in to_drop if c in df.columns]
    X = df.drop(columns=to_drop)
    return X, customer_refs


def score_batch(
    X: pd.DataFrame,
    model: object | None = None,
    preprocessor: ColumnTransformer | None = None,
    path_dir: Path | str = "artifacts",
) -> pd.DataFrame:
    """
    Batch scoring: churn probability + risk segment (CRM-ready).
    X must have same schema as training (features only, no target).
    """
    if model is None or preprocessor is None:
        model, preprocessor, _ = load_churn_artifacts(path_dir)
    X_fe = feature_engineering(X)
    X_arr = transform(X_fe, preprocessor)
    proba = model.predict_proba(X_arr)[:, 1]
    segment = _risk_segment(proba)
    return pd.DataFrame({"churn_score": proba, "risk_segment": segment})


if __name__ == "__main__":
    from sklearn.model_selection import train_test_split

    X_raw, y = load_data()
    X_fe = feature_engineering(X_raw)
    num_cols, cat_cols = _infer_numeric_categorical(X_fe)

    # Distribution summary (post–feature engineering)
    num_stats, cat_counts = distribution_summary(X_fe, num_cols, cat_cols)
    print("Distribution summary (numeric)")
    print("-" * 50)
    if not num_stats.empty:
        print(num_stats.round(4).to_string())
    print()
    print("Distribution summary (categorical)")
    print("-" * 50)
    for col, counts in cat_counts.items():
        print(f"  {col}: {counts.to_dict()}")

    # Correlation
    corr = correlation_matrix(X_fe, num_cols)
    print()
    print("Correlation matrix (numeric) — shape", corr.shape)
    print("-" * 50)
    print(corr.round(3).to_string())
    print()
    top = top_correlated_pairs(corr, n=15, min_abs=0.2)
    print("Top correlated pairs (|r| >= 0.2)")
    print("-" * 50)
    for a, b, r in top:
        print(f"  {a} ~ {b}: {r:.3f}")

    # Plots
    plot_dir = Path("analysis")
    plot_distributions(X_fe, num_cols, cat_cols, save_dir=plot_dir)
    plot_correlation(corr, save_dir=plot_dir)
    if _PLOTTING:
        print(f"\nPlots saved to {plot_dir}/")

    # Preprocessing + feature selection + XGBoost training
    print()
    print("Feature selection & training")
    print("-" * 50)
    model, preprocessor, feature_names, selected_cols, metrics, ranked = run_pipeline_with_selection(
        top_n=30, random_state=RANDOM_STATE
    )
    print(f"Selected {len(selected_cols)} features (correlation drop + XGBoost importance)")
    print("Top 15 by importance:")
    for col, imp in ranked[:15]:
        print(f"  {col}: {imp:.4f}")

    print()
    print("Preprocessing pipeline summary")
    print("-" * 50)
    _, y_full = load_data()
    uniq, cnt = np.unique(y_full, return_counts=True)
    print(f"Total samples: {len(y_full)}")
    print(f"Features (after selection): {len(feature_names)}")
    print(f"Feature names (first 10): {feature_names[:10]}")
    print(f"Target distribution: {dict(zip(map(int, uniq), map(int, cnt)))}")

    print()
    print("XGBoost training (with feature selection)")
    print("-" * 50)
    print(f"Accuracy: {metrics['accuracy']:.4f}")
    print(f"ROC-AUC: {metrics['roc_auc']:.4f}")
    print(f"PR-AUC:  {metrics['pr_auc']:.4f}")
    print(f"F1:      {metrics['f1']:.4f}")
    print()
    print("Classification report")
    print(metrics["classification_report"])

    save_churn_artifacts(model, preprocessor, feature_names, path_dir="artifacts", selected_cols=selected_cols)
    print("\nArtifacts saved to artifacts/ (batch scoring).")
