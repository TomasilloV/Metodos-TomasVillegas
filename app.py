"""
Calculadora de Métodos Numéricos
Backend con Flask — Tomas Villegas
"""

from flask import Flask, render_template, request, jsonify
import math

app = Flask(__name__)


# ──────────────────────────────────────────────
# Utilidades
# ──────────────────────────────────────────────

def safe_eval(expr: str, variables: dict) -> float:
    """Evalúa una expresión matemática de forma segura."""
    allowed_names = {
        "sin": math.sin, "cos": math.cos, "tan": math.tan,
        "asin": math.asin, "acos": math.acos, "atan": math.atan,
        "exp": math.exp, "log": math.log, "log10": math.log10,
        "sqrt": math.sqrt, "abs": abs, "pow": pow,
        "pi": math.pi, "e": math.e,
    }
    allowed_names.update(variables)
    return float(eval(expr, {"__builtins__": {}}, allowed_names))


def round_to(value, decimals=8):
    if not isinstance(value, (int, float)) or math.isnan(value):
        return value
    return round(value, decimals)


# ──────────────────────────────────────────────
# Rutas
# ──────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ─── Euler Mejorado (Heun) ───────────────────

@app.route("/api/euler", methods=["POST"])
def euler_mejorado():
    try:
        data = request.get_json()
        func_str = data["funcion"]
        x = float(data["x0"])
        y = float(data["y0"])
        xf = float(data["xf"])
        h = float(data["h"])

        if h <= 0:
            return jsonify({"error": "El incremento h debe ser positivo"}), 400
        if xf <= x:
            return jsonify({"error": "El valor final debe ser mayor que el inicial"}), 400

        # Row 0: initial values, dashes for computed fields
        results = [{"i": 0, "x": x, "fxy": round_to(y, 6), "k1": "-", "k2": "-", "yNext": "-", "error": "-"}]
        n = 0

        while x < xf - 1e-9:
            fxy = y  # f(xi, yi) = yi actual
            k1 = safe_eval(func_str, {"x": x, "y": y})
            y_pred = y + h * k1
            x_next = x + h
            k2 = safe_eval(func_str, {"x": x_next, "y": y_pred})

            y_new = y + (h / 2) * (k1 + k2)

            # Relative error in scientific notation
            if abs(y_new) > 1e-12:
                error_val = abs((y_new - y) / y_new)
            else:
                error_val = abs(y_new - y)
            error_str = f"{error_val:.6e}"

            y = y_new
            x = x_next
            n += 1

            results.append({
                "i": n,
                "x": round_to(x, 6),
                "fxy": round_to(fxy, 6),
                "k1": round_to(k1, 6),
                "k2": round_to(k2, 6),
                "yNext": round_to(y, 6),
                "error": error_str,
            })

        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ─── Runge-Kutta 4to Orden ───────────────────

@app.route("/api/runge-kutta", methods=["POST"])
def runge_kutta():
    try:
        data = request.get_json()
        func_str = data["funcion"]
        x = float(data["x0"])
        y = float(data["y0"])
        xf = float(data["xf"])
        h = float(data["h"])

        if h <= 0:
            return jsonify({"error": "El incremento h debe ser positivo"}), 400
        if xf <= x:
            return jsonify({"error": "El valor final debe ser mayor que el inicial"}), 400

        results = [{"i": 0, "xi": x, "k1": "-", "k2": "-", "k3": "-", "k4": "-", "yNext": y}]
        n = 0

        while x < xf - 1e-9:
            xi = x
            k1 = safe_eval(func_str, {"x": x, "y": y})
            k2 = safe_eval(func_str, {"x": x + h / 2, "y": y + h * k1 / 2})
            k3 = safe_eval(func_str, {"x": x + h / 2, "y": y + h * k2 / 2})
            k4 = safe_eval(func_str, {"x": x + h, "y": y + h * k3})

            y = y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
            x = x + h
            n += 1

            results.append({
                "i": n,
                "xi": round_to(xi, 6),
                "k1": round_to(k1, 6),
                "k2": round_to(k2, 6),
                "k3": round_to(k3, 6),
                "k4": round_to(k4, 6),
                "yNext": round_to(y, 6),
            })

        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ─── Newton-Raphson ──────────────────────────

@app.route("/api/newton-raphson", methods=["POST"])
def newton_raphson():
    try:
        data = request.get_json()
        func_str = data["funcion"]
        deriv_str = data.get("derivada", "").strip()
        x = float(data["x0"])
        tol = float(data.get("tolerancia", 1e-4))
        max_iter = int(data.get("maxIteraciones", 100))

        results = []
        converged = False

        for n in range(max_iter):
            fx = safe_eval(func_str, {"x": x})

            if deriv_str:
                fpx = safe_eval(deriv_str, {"x": x})
            else:
                h_num = 1e-7
                fx_plus = safe_eval(func_str, {"x": x + h_num})
                fx_minus = safe_eval(func_str, {"x": x - h_num})
                fpx = (fx_plus - fx_minus) / (2 * h_num)

            if abs(fpx) < 1e-12:
                return jsonify({"error": "La derivada es muy cercana a cero. Intenta con otro valor inicial."}), 400

            x_new = x - fx / fpx
            error = abs(x_new - x)
            error_str = f"{error:.2e}"

            results.append({
                "iter": n + 1,
                "x": round_to(x, 8),
                "fx": round_to(fx, 8),
                "fpx": round_to(fpx, 8),
                "xNew": round_to(x_new, 8),
                "error": error_str,
            })

            x = x_new

            if error < tol:
                converged = True
                break

        return jsonify({"results": results, "converged": converged})

    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True, port=5000)
