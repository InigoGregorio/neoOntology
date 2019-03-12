// File purpose:
// To generate a server that can provide interaction between ontologies
// in a standard format and the rtrbau expert system embedded in AR apps.

// File creation:
// Dependencies for this project have been set up manually in json file,
// according to the following tutorial: https://www.youtube.com/watch?v=snjnJCZhXUM
// neo4j-driver needs v1 because documentation says so: https://neo4j.com/developer/javascript/
// neo4j-driver session structure session {.run()/.then()/.catch()/.close()}

// Code description:
// When functions and variables are reused, they are only described at first point of use.
// All var declarations changed by let (when updated) or const (when fixed)

// NAMESPACES
const fs = require('fs');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const neo4j = require('neo4j-driver').v1;

// VARIABLES
// const port = process.env.PORT || 8008;
const port = 8008;
// To be changed once server becomes complete
const ontologiesURI = "http://138.250.108.1:3003/api/files/ontologies/";
// Ontology prefixes excluded from retrieval
const ontologiesDisabled = ['xml','rdf','rdfs','owl','xsd'];

// INITIALISATION
// Open express
const app = express();
// Connect to neo4j
// Declare a driver to connect
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j','opexcellence'));
// Open a session: REMEMBER ALWAYS TO CLOSE THE SESSION
var session = driver.session();

// MIDDLEWARE
// Setup for engine view and view files folder
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'ejs');
// Standard setup for body parsing
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
// Static folder setup for file sharing
// Folder structured according to file types (ontologies, images, 3D models, etc.)
app.use(express.static(path.join(__dirname,'files')));

// GET
// Ontology-related GET requests
// Ontology-level ontology-related GET requests
// Retrieve all ontologies available to be consulted
app.get('/api/ontologies', function(req,res){
    // Variable to capture parts of message being read in loop
    let ontologiesArray = [];
    // neo4j query session
    session
        .run(`MATCH (n:NamespacePrefixDefinition) RETURN properties(n)`)
        .then(function(result){
            // Review each record sent by neo4j
            result.records.forEach(function(record){
                // Variable to get keys from specific json object
                let ontologiesKeys = Object.keys(record._fields[0]);
                // For each loop over json keys to access json object indirectly
                ontologiesKeys.forEach(function(ontologyKey){
                    console.log(record._fields[0][ontologyKey]);
                    // Process key to check if it is a common ontology to avoid
                    if (ontologiesDisabled.includes(record._fields[0][ontologyKey]) !== true){
                        // Obtain elements from neo4j record and pass them over sending message
                        ontologiesArray.push({
                            ontology:{
                                prefix: record._fields[0][ontologyKey],
                                uri: ontologyKey
                            }
                        });
                    } else {}
                });
            });
            // All to be sent through json objects
            res.json(ontologiesArray);
        })
        .catch(function(err){
            res.json(err);
        });
});
// Class-level ontology-related GET requests
// Given a class name, retrieve its subclasses in json format
app.get('/api/ontologies/:ontologyName/class/:className/subclasses', function(req,res){
    // Variable to identify relevant uri to look for
    let uriElement = ontologiesURI + req.params.ontologyName + "#" + req.params.className;
    let subclassesArray = [];
    session
        .run(`MATCH (a:owl__Class{uri:"${uriElement}"})<-[m:rdfs__subClassOf]-(b:owl__Class) RETURN a.uri, b.uri`)
        .then(function(result){
            result.records.forEach(function(record){
               subclassesArray.push(returnUriElement(record._fields[1]));
            });
            res.json({class: req.params.className, subclasses: subclassesArray});
        })
        .catch(function(err){
            res.json(err);
        });
});
// Given a class name, retrieve all individuals that belong to it in json format
app.get('/api/ontologies/:ontologyName/class/:className/individuals', function(req,res){
    let individualsArray = [];
    session
        .run(`MATCH (n) WHERE n:owl__NamedIndividual AND n:${req.params.ontologyName}__${req.params.className} RETURN n.uri`)
        .then(function(result){
            result.records.forEach(function(record){
                individualsArray.push(returnUriElement(record._fields[0]));
            });
            res.json({class: req.params.className, individuals: individualsArray});
        })
        .catch(function(err){
            res.json(err);
        });
});
// Given a class name, retrieve its properties in json format
app.get('/api/ontologies/:ontologyName/class/:className/properties', function(req,res){
    let uriElement = ontologiesURI + req.params.ontologyName + "#" + req.params.className;
    session
        .run(`MATCH (a:owl__Class{uri:"${uriElement}"})<-[m:rdfs__domain]-(b)-[n:rdfs__range]->(c) WHERE b:owl__ObjectProperty OR b:owl__DatatypeProperty RETURN a.uri,b.uri,c.uri`)
        .then(function(result){
            let propertiesArray= [];
            result.records.forEach(function(record){
                propertiesArray.push({
                    property: {
                        // Record fields are declared according to cypher response structure
                        name: returnUriElement(record._fields[1]),
                        range: returnUriElement(record._fields[2])
                    }
                });
            });
            res.json({class: req.params.className, properties: propertiesArray});
        })
        .catch(function(err){
            res.json(err);
        });
});
// Individual-level ontology-related GET requests
// Given an individual name, retrieve its properties in json format
app.get('/api/ontologies/:ontologyName/individual/:individualName/properties', function(req,res){
    let uriElement = ontologiesURI + req.params.ontologyName + "#" + req.params.individualName;
    // To capture elements independently due to the message structure retrieved by the cypher query
    // Object properties are stored differently than data properties so they require different capture methods
    let classArray;
    let dataPropertiesArray = [];
    let objectPropertiesArray = [];
    session
        .run(`MATCH (a:owl__NamedIndividual{uri:"${uriElement}"})-[m]->(b) RETURN a.uri, labels(a), properties(a), type(m), b.uri`)
        .then(function (result){
            result.records.forEach(function(record, index, array){
                // Some fields in each record include repeated data, these need pre-processing
                // Pre-processing is not elegant as it repeats the same operation more than needed
                // Conditional clause included to avoid replication, only get results from first record
                if (Object.is(array.length - 1, index)) {
                    // Pre-processing of an array
                    record._fields[1].forEach(function(label) {
                        if (returnNeo4jNameElement(req.params.ontologyName, label) !== null) {
                            classArray = returnNeo4jNameElement(req.params.ontologyName, label);
                        } else {}
                    });
                    // Pre-processing of a json object using keys as an array to maintain forEach use
                    let dataPropertiesKeys = Object.keys(record._fields[2]);
                    dataPropertiesKeys.forEach(function(dataPropertyKey){
                       if(returnNeo4jNameElement(req.params.ontologyName,dataPropertyKey) !== null) {
                           dataPropertiesArray.push({
                               property: {
                                   name: returnNeo4jNameElement(req.params.ontologyName,dataPropertyKey),
                                   value: record._fields[2][dataPropertyKey]
                               }
                           });
                       } else {}
                    });
                }
                // Then objects which determine the record length list are processed
                objectPropertiesArray.push({
                    property: {
                        name: returnNeo4jNameElement(req.params.ontologyName,record._fields[3]),
                        value: returnUriElement(record._fields[4])
                    }
                });
            });
            // Because data and object properties are similar in nature, they are concatenated to be sent
            res.json({individual: req.params.individualName, class: classArray, properties: dataPropertiesArray.concat(objectPropertiesArray)});
        })
        .catch(function(err){
            res.json(err);
        });
});
// File-related GET requests
// Given a file type and name, retrieve the file
app.get('/api/files/:fileType/:fileName', function(req,res){
    // Error handling: if fileType is not available
    if(!returnAvailable(path.join(__dirname,"files"), req.params.fileType)) res.status(404).send('File type not available');
    // Error handling: if fileName is not available
    if(!returnAvailable(path.join(__dirname,"files",req.params.fileType), req.params.fileName)) res.status(404).send('File not available');
    //console.log(filenames);
    //res.send(returnAvailable(`files/${req.params.fileType}`, req.params.fileType).toString());
    res.sendFile(path.join(__dirname,"files",req.params.fileType,req.params.fileName));
});
// View-related GET requests
// Ontology view-related GET requests
// Given an ontology name, retrieve the ontology
// TO BE COMPLETED ONCE SERVER FINISHED: "http://138.250.108.1:3003/api/files/ontologies/rtrbau#"
// Given an ontology element name, retrieve the element
// TO BE COMPLETED ONCE SERVER FINISHED: "http://138.250.108.1:3003/api/files/ontologies/rtrbau#element"

// POST
// Ontology-related POST requests
// Ontology-level ontology-related POST requests
// Class-level ontology-related POST requests
// Individual-level ontology-related POST requests
// File-related POST requests
// Ontology file-related POST requests
// Image file-related POST requests
// 3D Model file-related POST requests

// PUT

// DELETE

// PORT
app.listen(port, function(){console.log(`Server listening on port: ${port}`)});

// EXPORTING METHOD
// To export the functions declare as a single class
module.export = app;

// FUNCTIONS
// Specific functions created to add data processing support to server exchange
// This can be exported as middleware independently afterwards if too many
function returnUriElement (uri) {
    // For parsing uri elements generically
    // If not null, returns element name splitted from uri after "#"
    if (uri != null) {
        return uri.split("#")[1];
    } else {
        return null;
    }
}
function returnNeo4jNameElement (prefix, element) {
    // For parsing prefixed names in neo4j
    // If not null, retrieve elements name that match the ontology prefix
    if (element.includes("__") === true && element.split("__")[0] === prefix) {
        return element.split("__")[1];
    } else {
        return null;
    }
}
function returnAvailable (dirname,filename) {
    // Returns true if filename can be found in dirname directory
    // Avoids 'hidden' directories '.'
    let filesAvailable = fs.readdirSync(dirname);
    filesAvailable = filesAvailable.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
    return filesAvailable.includes(filename);
}