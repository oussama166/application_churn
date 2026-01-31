"""
Churn model training (XGBoost). For batch / orchestration (e.g. Airflow, Prefect).
Runs preprocessing + training, saves artifacts for batch scoring.
Uses feature selection by default (correlation drop + XGBoost importance).
"""

import argparse
from pathlib import Path

from index import (
    RANDOM_STATE,
    run_pipeline,
    run_pipeline_with_selection,
    save_churn_artifacts,
    train_xgboost,
)
from sklearn.model_selection import train_test_split


def main(use_selection: bool = True, top_n: int = 30) -> None:
    if use_selection:
        model, preprocessor, feature_names, selected_cols, metrics, ranked = run_pipeline_with_selection(
            top_n=top_n, random_state=RANDOM_STATE
        )
        print("Feature selection (top", top_n, ")")
        print("-" * 50)
        for col, imp in ranked[:15]:
            print(f"  {col}: {imp:.4f}")
        print("  ...")
        print(f"Selected {len(selected_cols)} features")
        save_churn_artifacts(model, preprocessor, feature_names, path_dir=Path("artifacts"), selected_cols=selected_cols)
    else:
        X_processed, y_arr, preprocessor, feature_names, _ = run_pipeline(apply_fe=True)
        X_train, X_test, y_train, y_test = train_test_split(
            X_processed, y_arr, test_size=0.2, random_state=RANDOM_STATE, stratify=y_arr
        )
        model, metrics = train_xgboost(X_train, y_train, X_test, y_test)
        save_churn_artifacts(model, preprocessor, feature_names, path_dir=Path("artifacts"))

    print()
    print(f"ROC-AUC: {metrics['roc_auc']:.4f}  PR-AUC: {metrics['pr_auc']:.4f}  F1: {metrics['f1']:.4f}  Acc: {metrics['accuracy']:.4f}")
    print("Artifacts saved to artifacts/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-selection", action="store_true", help="Disable feature selection (use all features)")
    parser.add_argument("--top-n", type=int, default=30, help="Number of top features to keep (default: 30)")
    args = parser.parse_args()
    main(use_selection=not args.no_selection, top_n=args.top_n)
