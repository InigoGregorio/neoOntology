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
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const neo4j = require('neo4j-driver').v1;

// VARIABLES
// const port = process.env.PORT || 8008;
const port = 8008;
// To be changed once server becomes complete
const ontologiesURI = "http://138.250.108.1:3003/api/ontologies/";

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
// Static folder setup for file sharing (bootstrap, jquery, images, etc.)
app.use(express.static(path.join(__dirname,'public')));

// GET
// Given a class name, retrieve its properties in json format
app.get('/api/ontologies/:ontologyName/class/:className/properties', function(req,res){
    // Variable to identify relevant uri to look for
    let uriElement = ontologiesURI + req.params.ontologyName + "#" + req.params.className;
    // neo4j query session
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
            res.send(err);
        });
});
// Given a class name, retrieve all individuals that belong to it in json format
app.get('/api/ontologies/:ontologyName/class/:className/individuals', function(req,res){
    // Variable to capture parts of message being read in loop
    let individualsArray = [];
    session
        .run(`MATCH (n) WHERE n:owl__NamedIndividual AND n:${req.params.ontologyName}__${req.params.className} RETURN n.uri`)
        .then(function(result){
           result.records.forEach(function(record){
               individualsArray.push({
                  individual: returnUriElement(record._fields[0])
               });
           });
           res.json({class: req.params.className, individuals: individualsArray});
        })
        .catch(function(err){
            res.send(err);
        });
});
// Given an individual name, retrieve its properties in json format
app.get('/api/ontologies/:ontologyName/individual/:individualName/properties', function(req,res){
    let uriElement = ontologiesURI + req.params.ontologyName + "#" + req.params.individualName;
    // To capture elements independently due to the message structure retrieved by the cypher query
    // Object properties are stored differently than data properties so they require different capture
    let classArray;
    let dataPropertiesArray = [];
    let objectPropertiesArray = [];
    session
        .run(`MATCH (a:owl__NamedIndividual{uri:"${uriElement}"})-[m]->(b) RETURN a.uri, labels(a), properties(a), type(m), b.uri`)
        .then(function (result){
            // Return class name, data and object properties names and values
            // result.records[0]._fields[2].forEach(function (record){
            //     dataPropertiesArray.push(record);
            //     //     property: {
            //     //         name:
            //     //     }
            //     // });
            // });
            // console.log(dataPropertiesArray);
            // // Return class name of individual in the ontology
            // result.records[0]._fields[1].forEach(function (record){
            //     if (returnNeo4jNameElement(req.params.ontologyName,record) !== null) {
            //         className = returnNeo4jNameElement(req.params.ontologyName,record);
            //         console.log(className);
            //     }
            // });
            result.records.forEach(function(record, index, result){
                // Some fields in each record include repeated data, these need pre-processing
                // Pre-processing is not elegant as it repeats the same operation more than needed
                // Conditional clause included to avoid replication, only get results from first record
                if (Object.is(result.length - 1, index)) {
                    // Pre-processing of an array
                    record._fields[1].forEach(function(label){
                        if (returnNeo4jNameElement(req.params.ontologyName,label) !== null) {
                            classArray = returnNeo4jNameElement(req.params.ontologyName,label);
                        }
                    });
                    // Pre-processing of a json object
                    for (let dataProperty in record._fields[2]) {
                        if (returnNeo4jNameElement(req.params.ontologyName,dataProperty) !== null){
                            dataPropertiesArray.push({
                                property: {
                                    name: returnNeo4jNameElement(req.params.ontologyName,dataProperty),
                                    value: record._fields[2][dataProperty]
                                }
                            });
                        }
                    }
                }
                // record._fields[2].forEach(function(dataProperty) {
                //     Object.keys(dataProperty);
                //     console.log("Hello");
                // });
                // Then objects which give the final record list are processed
                objectPropertiesArray.push({
                    property: {
                        name: returnNeo4jNameElement(req.params.ontologyName,record._fields[3]),
                        value: returnUriElement(record._fields[4])
                    }
                });
            });
            //res.json(objectPropertiesArray);
            //console.log(objectPropertiesArray);
            // Return data properties names and values: similar in each record
            //res.json({individual: req.params.individualName, class: req.params.ontologyName, properties: ""});
            res.json({individual: req.params.individualName, class: classArray, properties: dataPropertiesArray.concat(objectPropertiesArray)});
        })
        .catch(function(err){
            res.send(err);
        });
});
// POST

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