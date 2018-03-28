document.getElementById('import-database-merge-file')
    .addEventListener('change', event => {
      let fileObj = event.target.files[0];
      dbImport('merge', readFile(fileObj, 'confirm_db_merge_FILENAME'));
    });
document.getElementById('import-database-replace-file')
    .addEventListener('change', event => {
      let fileObj = event.target.files[0];
      dbImport('replace', readFile(fileObj, 'confirm_db_replace_FILENAME'));
    });
document.getElementById('import-database-overwrite-file')
    .addEventListener('change', event => {
      let fileObj = event.target.files[0];
      dbImport('overwrite', readFile(fileObj, 'confirm_db_overwrite_FILENAME'));
    });
rivets.bind(document.body, {});
