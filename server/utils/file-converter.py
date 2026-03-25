# converter/app.py
from flask import Flask, request, send_file, jsonify
import os
import glob
from docx2pdf import convert
from pathlib import Path

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / 'uploads'
OUTPUT_DIR = BASE_DIR / 'output'

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ─── Single file conversion ───────────────────────────────────────────────────
@app.route('/convert', methods=['POST'])
def convert_single():
    if 'file' not in request.files:
        return jsonify({ 'error': 'No file provided' }), 400

    file = request.files['file']
    if not file.filename.endswith(('.doc', '.docx')):
        return jsonify({ 'error': 'File must be .doc or .docx' }), 400

    input_path = UPLOAD_DIR / file.filename
    output_path = OUTPUT_DIR / (Path(file.filename).stem + '.pdf')

    file.save(str(input_path))

    try:
        convert(str(input_path), str(output_path))
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500
    finally:
        if input_path.exists():
            os.remove(input_path)  # clean up uploaded file

    return send_file(str(output_path), mimetype='application/pdf', as_attachment=True)


# ─── Batch conversion ─────────────────────────────────────────────────────────
@app.route('/convert/batch', methods=['POST'])
def convert_batch():
    data       = request.json
    input_dir  = data.get('input_dir')   # path to folder of .docx files
    output_dir = data.get('output_dir', str(OUTPUT_DIR))

    if not input_dir or not os.path.isdir(input_dir):
        return jsonify({ 'error': 'Invalid input directory' }), 400

    os.makedirs(output_dir, exist_ok=True)

    files     = glob.glob(os.path.join(input_dir, '*.docx'))
    converted = []
    failed    = []

    for file_path in files:
        try:
            output_path = os.path.join(output_dir, Path(file_path).stem + '.pdf')
            convert(file_path, output_path)
            converted.append(Path(file_path).name)
        except Exception as e:
            failed.append({ 'file': Path(file_path).name, 'error': str(e) })

    return jsonify({
        'converted': converted,
        'failed':    failed,
        'total':     len(files),
        'success':   len(converted)
    })


if __name__ == '__main__':
    app.run(port=5001, debug=False)