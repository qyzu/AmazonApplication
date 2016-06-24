var AWS = require("aws-sdk");
var helpers = require("../helpers");
var simpledb = require('simpledb');
AWS.config.loadFromPath('./config.json');
var AWS_CONFIG_FILE = "config.json";


//Response after file uploading:
var task = function(request, callback) {

/*
Worker jest oddzielna aplikacja uruchamianą jako node app.js na oddzielnej instancji Amazona.
1. Sprawdza czy w sqs sa jakies messages z informacjami o plikach w kolejce do zmodyfikowania.
2. Jezeli są to je pobiera z S3 na podstawie informacji z kolejki.
3. Oraz modyfikuje je (np. zmienia rozmiar)
4. Następnie wysyla zmodyfikwoane pliki z powrotem do S3
5. Na koniec wysyla logi do dsimpleDB analogiczne do wysylanych plikow wczesniej, ale moze jeszcze z info ze zostal zmodyfikowany.
*/

/*
tutaj jeszcze musi byc gdzies dodanie do kolejki SQS info o juz zupoadowanym pliku zeby moc na nim wykonac operacje.
moge np zrobic poki co 1 przycisk ktorym bede pobieral dane o wszystkich plikach i na kazdym z nich wysle do kolejki SQS info zeby je zuploadowac.
*/
//poki co test: w innym miejscu on powinien byc po nacisnieciu buttona ze chce pliki zmodyfikowac (np. wszystkie dotychczas zuploadowane),
//a Worker moze byc napisany np. w Java, zeby rownolegle zrobic wszystkie operacje na plikach...
/*
1. po dodaniu pliku do s3 jest redirect (ta funkcja w kterej ten komentarz jest napisany) w ktorym moge pobrac z s3 wylisstowane parametry
bucket - key i wyswietlic liste plikow uzytkownikowi.
2. bedzie tez do dodania przycisk ktory zrobi aby wszystkie (albo tylk ozaznaczone) te wylisotwane dane wysle do SQS jako string
(wiec w innym miejscu musze ta funckje dodawania do sqs dac).
3. Worker bedzie musial to odebrac i wykonac na nich operacje, a dla webservisu juz chyba praca sie skonczy.
*/


    var params = {
        Bucket: request.query["bucket"], //required
        Key: request.query["key"], //required
    };

    //Sprawdzenie, czy sie udalo zuploadowac plik i dodac do S3:
    getUploadedFileFromS3(request, params);

    callback(null, request.body);
}

//Metoda sprawdzajaca czy sie udalo zuploadowac plik i dodac do S3:
function getUploadedFileFromS3(request, params) {
    //Pobranie zapisanego obiektu z S3:
    var s3 = new AWS.S3();
    s3.getObject(params, function(err, data) {
        if (err) {
          console.log(err, err.stack); // an error occurred
        } else {
          //Successful response:
          console.log("FILE UPLOADED SUCCESFULLY!:\n");
          //console.log(data);
          addLogsToSimpleDB(data, params);
        }
    });
}

function addLogsToSimpleDB(data, params) {
    console.log("ADDING LOG TO SIMPLE_DB:\n");
    //Wyliczenie dla niego wartosci skrotu:
    var digets = helpers.calculateDigest("MD5", data.Body);

    //Wysylanie logow do SImpleDB po wyliczeniu skrotu:
    var domainName = 'klysSimpleDB';
    var awsConfig = helpers.readJSONFile(AWS_CONFIG_FILE);
    var sdb      = new simpledb.SimpleDB({keyid:awsConfig.accessKeyId,secret:awsConfig.secretAccessKey})

    sdb.createDomain(domainName, function(error) {
      sdb.putItem(domainName, 'item1', {attr1:params.Bucket, attr2:params.Key, attr3:digets}, function( error ) {
        sdb.getItem(domainName, 'item1', function( error, result ) {
          console.log('Bucket = '+ result.attr1 )
          console.log('Key = '+ result.attr2 )
          console.log('Skrot = '+ result.attr3 )
        })
      })
    })
}


exports.action = task
