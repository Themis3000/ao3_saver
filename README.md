# ao3 saver - never lose your ao3 reading again

A browser extension that automatically backs up everything you read on ao3.

Built to be robust, ao3 saver currently:
- serves 700 unique users/day
- handles 20k requests/day
- has a library of 1.25 million archived works, stored efficently in just 657gb (including images!)

This is the repository for the browser extension ao3 saver. This repo only contains the code for the front end repo. This extension also depends on a backend and worker for its basic functions to work. The code for the backend service can be found here: https://github.com/Themis3000/ao3_saver_backend, and the code for the worker process can be viewed here: https://github.com/Themis3000/ao3saver_worker

This extension helps preserve works on ao3. When the extension is installed & enabled viewed works will be automatically backed up to the backend service. If the work is ever removed, and you are met with a 404 page ao3 saver will provide a link to the backed up copy stored on the server. Using this extension, you should never lose a work after its deletion.

### Features

- Automatic work backup
- Queryable viewed work history, sorted by last viewed
- Additional buttons to assist with finding works not previously backed up on ao3 saver servers
