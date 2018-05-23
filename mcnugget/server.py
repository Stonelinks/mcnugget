import os
import sys
import time
import glob
import shutil
import werkzeug.formparser
from flask import Flask, Response, request, send_from_directory, send_file, jsonify, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
import zipfile
import filecmp
import multiprocessing

from mcnugget.config import APP_PATH, DATA_PATH, UPLOADS_PATH, PROCESSING_PATH
from mcnugget.utils import allowed_file
from mcnugget.pipeline import make_happy_meal


app = Flask(__name__, static_folder=APP_PATH)
app.config['UPLOAD_FOLDER'] = UPLOADS_PATH
CORS(app)

# upload a file, if zip, extract it


@app.route('/upload/<project_id>/<filename>', methods=['POST'])
def upload(project_id, filename):
    if 'file' not in request.files:
        print('No file part')
        return Response(status=400)
    file = request.files['file']

    if file.filename == '':
        print('No selected file')
        return Response(status=400)

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        uploads_path = os.path.join(UPLOADS_PATH, secure_filename(project_id))
        os.makedirs(uploads_path, exist_ok=True)
        file_path = os.path.join(uploads_path, filename)
        file.save(file_path)
        _, file_extension = os.path.splitext(file_path)
        if file_extension == ".zip":
            extracted_path = os.path.join(
                uploads_path, filename + "_extracted")
            os.makedirs(extracted_path, exist_ok=True)
            with zipfile.ZipFile(file_path, "r") as zip_ref:
                zip_ref.extractall(extracted_path)
    return Response(status=200)

# serve files and directory listings from data dir


@app.route('/data_files/', defaults={'path': ''})
@app.route('/data_files/<path:path>')
def data_files(path):
    req_path = os.path.join(DATA_PATH, path)

    # check against bad users
    if req_path != DATA_PATH and os.path.commonprefix((os.path.realpath(req_path), DATA_PATH)) != DATA_PATH:
        print('No access to files outside %s' % DATA_PATH)
        return Response(status=400)

    # check if path is a file and serve
    if os.path.isfile(req_path):
        r = send_file(req_path)
        r.headers["Pragma"] = "no-cache"
        r.headers["Expires"] = "0"
        r.headers['Cache-Control'] = 'public, max-age=0'
        return r

    # show directory contents
    dirlist = []
    for f in os.listdir(req_path):
        file_path = os.path.join(path, f)
        abs_file_path = os.path.join(req_path, f)
        is_file = os.path.isfile(abs_file_path)
        file_size = os.stat(abs_file_path).st_size if is_file else 0
        num_files = len(os.listdir(abs_file_path)) if not is_file else 0
        dirlist.append({
            "name": f,
            "path": file_path,
            "isFile": is_file,
            "size": file_size,
            "numItems": num_files
        })
    return jsonify(dirlist)

# beign processing of an upload folder


@app.route('/begin_processing/<project_id>', methods=['POST'])
def begin_processing(project_id):
    uploads_path = os.path.join(UPLOADS_PATH, project_id)
    processing_path = os.path.join(PROCESSING_PATH, project_id)
    os.makedirs(processing_path, exist_ok=True)
    image_list_path = os.path.join(processing_path, 'raw_images.txt')

    # flatten from uploads into processing path
    image_list = []
    files_to_copy = []
    for ext_lower in ['png', 'jpg', 'jpeg']:
        for ext in [ext_lower, ext_lower.upper()]:
            for glob_sep in ["/*.", "/**/*."]:
                for f in glob.glob(uploads_path + glob_sep + ext):
                    files_to_copy.append(f)
    for f in files_to_copy:
        file_name = os.path.split(f)[-1]
        dst_path = os.path.join(processing_path, file_name)
        
        # renaming as necessary and skipping similar files
        if os.path.exists(dst_path) and not filecmp.cmp(f, dst_path):
            base_file_name, ext = os.path.splitext(file_name)
            tries = 1
            while os.path.exists(dst_path):
                dst_path = os.path.join(
                    processing_path, base_file_name + "_" + str(tries) + ext)
                tries += 1
        image_list.append(os.path.split(dst_path)[-1])
        shutil.copyfile(f, dst_path)

    # write image list
    with open(image_list_path, 'w') as f:
        f.write('\n'.join(sorted(image_list)) + '\n')

    make_happy_meal(project_id)
    return Response(status=200)


@app.route('/reprocess/<project_id>', methods=['POST'])
def reprocess(project_id):
    make_happy_meal(project_id)
    return Response(status=200)


# catchall, serve the frontend


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(APP_PATH, path)):
        return send_from_directory(APP_PATH, path)
    else:
        return send_from_directory(APP_PATH, 'index.html')


@app.before_request
def before_request():
    g.start = time.time()
    g.end = None


@app.teardown_request
def teardown_request(exc):
    g.end = time.time()
    diff = g.end - g.start
    if app.debug:
        print("Request took {} secs".format(str(diff)))


def start_server():
    app.run(use_reloader=True, host='0.0.0.0',
            port=5000, threaded=True, debug=True)
