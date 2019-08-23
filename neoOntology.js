// I. SERVER DESCRIPTION:
// Maintenance Ontology Reasoner:
// An ontology-elements and files server to feed data into RTRBAU applications.
// Code below is described in terms of theoretical (THE), implementation (IMP) and error handling (ERR) descriptors.
// Potential upgrades (UPG) and maintainability (MAN) issues are also declared.

// II. SERVER STRUCTURE:
// 1. Namespaces
// 2. Initialisation
// 3. Middleware
// 4. Ad-hoc
// 4.1. Variables
// 4.2. Functions
// 5. HTTP methods:
// 5.1. Get requests: [file,ontology,controlmonitoring] {view}
// 5.2. Post requests: [ontology] {file,view}
// 5.3. Put requests: []
// 5.4. Delete requests: []
// 6. Port
// 7. Export

// III. MISCELLANEOUS:
// A. File creation:
// A.1. Dependencies created manually in json file according to: https://www.youtube.com/watch?v=snjnJCZhXUM
// B. Server setup:
// B.1. neo4j-driver for nodejs and neo4j:
// B.1.1. Requires v1 according to: https://neo4j.com/developer/javascript/
// B.1.2. Query structure: session (Promise) .run().then({...close()}).catch({...close()})
// B.1.3. Remember to close all session variables when programming queries
// C. Code description:
// C.1. Uses nomenclature identified in server description
// C.2. Description is made at first point of use

// 1. NAMESPACES:
// 1.1. Nodejs Modules:
// 1.1.1. To read files and directories
const fs = require('fs');
// 1.1.2. To work with file and directory paths
const path = require('path');
// 1.2. Third-party Modules:
// 1.2.1. To code web applications (http requests)
const express = require('express');
// 1.2.2. To log sever usage and console messages
const morgan = require ('morgan');
// 1.2.3. To parse and handle errors in data before use
const bodyParser = require('body-parser');
// 1.2.4. To connect to neo4j graphical databases
const neo4j = require('neo4j-driver').v1;

// 2. INITIALISATION
// 2.1. Instantiate web application framework
const app = express();
// 2.2. Declare route to neo4j server
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j','opexcellence'));
// 2.3. Instantiate connection to neo4j server
let session = driver.session();

// 3. MIDDLEWARE
// 3.1. Setup engine view for dynamic files (e.g. html, ejs)
app.set('view engine', 'ejs');
// 3.2. Setup directory for dynamic files
// UPG: to include plain view of ontologies elements
app.set('views', path.join(__dirname,'views'));
// 3.3. Setup directory for static files (file sharing)
// IMP: directory is structured according to file types [ontologies, 3Dmodels, images]
app.use(express.static(path.join(__dirname,'files')));
// 3.4. Setup logger method
app.use(morgan('dev'));
// 3.5. Setup body parsing method {standard}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

// 4. AD-HOC
// 4.1. VARIABLES
// 4.1.1. Port management (considers existence of environmental variables):
// UPG: to add environmental variable for server machine to move port for listening
// IMP: for raspberry pi to have a specific port in case environmental variable not implemented
const port = process.env.PORT || 3003;
// 4.1.2. Ontologies uri management (considers limited number of ontologies and so prefixes)
// UPG: to re-write server functionality considering existence of non-proprietary ontologies
// UPG: to re-write server functionality to read ontologies available from neo4j database
// IMP: to consider that only ontologies declared in the server are available
const ontologiesURI = "http://138.250.108.1:3003/api/files/owl/";
// IMP: to manage non-proprietary ontologies required for rdfs reasoning
const classOntologyURI = "http://www.w3.org/2002/07/owl";
// const datatypeOntologyURI = "http://www.w3.org/2001/XMLSchema";
// IMP: to manage non-used ontology prefixes declared in neo4j
const ontologiesDisabled = ['xml','rdf','rdfs','owl','xsd'];
// 4.2. FUNCTIONS
// UPG: to export as middleware when number of functions becomes considerable
// 4.2.1. Obtain: functions to read names of items stored in server (files and neo4j)
// 4.2.1.1. Obtain file names: to work with files for sharing
function returnFilesAvailable (dirname,filename) {
    // Returns true if filename can be found in dirname directory
    let filesAvailable = fs.readdirSync(dirname);
    // Avoids 'hidden' directories '.'
    filesAvailable = filesAvailable.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
    return filesAvailable.includes(filename);
}
// 4.2.1.2. Obtain ontologies names: to work with existing ontologies in neo4j database
// IMP: to re-write server functionality according to UPG2 of variable 4.1.2
// function returnOntologiesAvailable () {}
// 4.2.2. Abbreviate: functions to manage items names according to uri and neosemantics
// 4.2.2.1. Abbreviate uri: to work with rdfs naming convention
// UPG: to serve uri prefix and name as independent variables for managing
// UPG: to manage external, non-proprietary ontologies
// IMP: splits uri as it considers all prefixes are the same "ontologiesURI"
function returnUriElement (uri) {
    // For parsing uri elements generically
    // If not null
    if (uri != null) {
        // Returns element name splitted from uri after "#"
        return uri.split("#")[1];
    } else {
        // Otherwise returns null
        return null;
    }
}
// 4.2.2.2. Abbreviate neo4j: to work with neo4j-neosemantics naming convention
// UPG: to serve uri prefix and name as independent variables for managing
// UPG: to manage external, non-proprietary ontologies
function returnNeo4jNameElement (prefix, element) {
    // For parsing prefixed names in neo4j
    // If not null
    if (element.includes("__") === true && element.split("__")[0] === prefix) {
        // Retrieves element name that matches the ontology prefix
        return element.split("__")[1];
    } else {
        // Otherwise returns null
        return null;
    }
}
// 4.2.2.3. Abbreviate neo4j into uri: to convert neo4j-neosemantics notation in uri notation
// UPG: to manage all neo4j implemented ontologies independently
// IMP: returns the uri of a given element coded by neo4j-neosemantics
function returnURIfromNeo4jElement (element) {
    // Parses name in neo4j finds relevant url and return uri element
    // If element is from owl applies classOntologyURI otherwise applies proprietary url
    if (element.includes("__") === true && element.split("__")[0] === 'owl') {
        // Retrieves element name that matches the ontology prefix
        return classOntologyURI + "#" + element.split("__")[1];
    } else if (element.includes("__") === true && element.split("__")[0] !== 'owl') {
        // Otherwise returns null
        return ontologiesURI + element.split("__")[0] + "#" + element.split("__")[1];
    } else {
        // Otherwise returns null
        return null;
    }
}
// 4.2.2.4. Construct uri from ontology name: to convert names in uri notiation
// IMP: returns the uri of given ontology prefix and class name
function constructURI (prefix,name) {
    // Concatenates ontological names to create the uri resource
    return ontologiesURI + prefix + "#" + name;
}
// 5. HTTP METHODS
// 5.1. GET REQUESTS
// 5.1.0. Homepage GET request:
// 5.1.0.1. Homepage
// UPG: to implement a homepage for the server where files can be accessed
// 5.1.0.2. Ping
// IMP: a ping request to ensure server is up and running
// UPG: upgrade to a more inventive ping
app.get('/api/ping', function(req,res){
    // neo4j query session: uses cypher language to consult graphical database
    session
    // returns if neosemantics is installed on the server
    // implies that neo4j is up and running
        .run(`MATCH (n) RETURN n LIMIT 1`)
        .then(function(result){
            res.json(result.records);
        })
        .catch(function(err){
            res.json(err);
        });
});
// 5.1.1. File GET requests:
// 5.1.1.1. Files retrieval
// IMP: given a file type, retrieve files available
app.get('/api/files/:fileType', function(req,res){
    // ERR: if fileType is not available
    if(!returnFilesAvailable(path.join(__dirname,"files"), req.params.fileType)) {
        res.status(404).send('File type not available');
    } else {
        let filesNames = fs.readdirSync(`files/${req.params.fileType}`);
        // Avoids '.' 'hidden' directories
        res.send(filesNames.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item)));
    }
});
// 5.1.1.2. File download
// IMP: given a file full-name and type, send file
app.get('/api/files/:fileType/:fileName', function(req,res){
    // ERR: if fileType is not found
    if(!returnFilesAvailable(path.join(__dirname,"files"),req.params.fileType)) {
        res.status(404).send('File type not available');
    }
    // ERR: if fileName is not found
    else if(!returnFilesAvailable(path.join(__dirname,"files",req.params.fileType),req.params.fileName)) {
        res.status(404).send('File not available');
    }
    else {
        res.sendFile(path.join(__dirname,"files",req.params.fileType,req.params.fileName));
    }
});
// 5.1.2. Ontology GET requests
// THE: uses rdfs language to identify all possible inferences that can be done for an ontology, a class or an individual
// THE: requests implement so far are [ontology, class[subClasses,individuals,properties], individual[properties]]
// UPG: to include also reasoning about properties {datatype,object}
// UPG: to extend from rdfs to owl (REQUIRES of upgrading neosemantics)
// 5.1.2.1. Ontology-level GET requests:
// 5.1.2.1.1. Namespace: to retrieve all proprietary ontologies available in neo4j graph
// THE: rdf:RDF | to consult what knowledge domains can be queried
// IMP: returns prefixes and names in json format
app.get('/api/ontologies', function(req,res){
    // Variable to capture parts of message being read in loop
    let ontologies = [];
    // neo4j query session: uses cypher language to consult graphical database
    session
    // returns namespaces prefixes according to neosemantics declaration
        .run(`MATCH (n:NamespacePrefixDefinition) RETURN properties(n)`)
        .then(function(result){
            // Review each record sent by neo4j
            result.records.forEach(function(record){
                // Variable to get keys from specific json object
                let ontologiesKeys = Object.keys(record._fields[0]);
                // For each loop over json keys to access json object indirectly
                ontologiesKeys.forEach(function(ontologyKey){
                    // Process key to check if it is a common ontology to avoid
                    if (ontologiesDisabled.includes(record._fields[0][ontologyKey]) !== true){
                        // Obtain elements from neo4j record and pass them over sending message
                        ontologies.push({
                            ontPrefix: record._fields[0][ontologyKey],
                            ontUri: ontologyKey
                        });
                    } else {}
                });
            });
            // All to be sent through json objects
            res.json({ontOntologies: ontologies});
        })
        // Handles neo4j errors
        .catch(function(err){
            res.json(err);
        });
});
// 5.1.2.2. Class-level GET requests:
// 5.1.2.2.1. Class subclasses: to retrieve classes and subclasses within an ontology
// THE: rdfs:subClassOf | to navigate through ontology classes
// IMP: ontology policy development ensures all classes belong to the namespace class
// IMP: given an ontology and a class name, returns subclasses in json format
// UPG: rdfs:subPropertyOf | to extend queries to subProperties
// UPG: to manage ontology prefixes, maybe update ontologiesURI to a function to retrieve prefix?
// UPG: that will require to maintain a list of available prefixes similar to the one in neo4j node, maybe consult?
app.get('/api/ontologies/:ontologyName/class/:className/subclasses', function(req,res){
    // Variable to identify relevant uri to look for
    // let uriElement = ontologiesURI + req.params.ontologyName + "#" + req.params.className;
    let uriElement = constructURI(req.params.ontologyName, req.params.className);
    // Variable to capture subclasses names
    let subclassesArray = [];
    session
        // Matches owl__Class nodes by uri and return other owl__Class nodes through rdfs__subClassOf relationships
        .run(`MATCH (a:owl__Class{uri:"${uriElement}"})<-[r:rdfs__subClassOf]-(b:owl__Class) RETURN a.uri, b.uri`)
        .then(function(result){
            // Evaluates if the server contains nodes that match the uri
            if (result.records.length !== 0) {
                // Captures each subclass name from results retrieved from neo4j
                result.records.forEach(function(record){
                    // subclassesArray.push(returnUriElement(record._fields[1]));
                    subclassesArray.push({ontSubclass: record._fields[1]});
                });
                // Formats results in a json object
                // res.json({class: req.params.className, subclasses: subclassesArray});
                res.json({ontClass: uriElement, ontSubclasses: subclassesArray});
            } else {
                // Otherwise sends an error
                res.json({ontError:"Subclasses not found"});
            }
        })
        .catch(function(err){
            res.json(err);
        });
});
// 5.1.2.2.2. Class individuals: to retrieve individuals that belong to a class
// THE: owl:NamedIndividual | to identify individuals instantiated to a class
// IMP: uses neosemantics notation (ontology__element) to identify a class
// IMP: given an ontology and a class name, returns its individuals in json format
// UPG: to extend identification of class and individuals that may be replicated in other ontologies
app.get('/api/ontologies/:ontologyName/class/:className/individuals', function(req,res){
    let uriElement = constructURI(req.params.ontologyName, req.params.className);
    // Variable to identify individuals names
    let individualsArray = [];
    session
        // Matches nodes with owl__NamedIndividual and ontology__class labels to retrieve class individuals
        .run(`MATCH (n) WHERE n:owl__NamedIndividual AND n:${req.params.ontologyName}__${req.params.className} RETURN n.uri`)
        .then(function(result){
            // Evaluates if the server contains nodes that match the class
            if (result.records.length !== 0) {
                // Captures individual names retrieved by neo4j
                result.records.forEach(function(record){
                    // individualsArray.push(returnUriElement(record._fields[0]));
                    individualsArray.push({ontIndividual: record._fields[0]});
                });
                // Returns individuals names of class name in json format
                // res.json({class: req.params.className, individuals: individualsArray});
                res.json({ontClass: uriElement, ontIndividuals: individualsArray});
            } else {
                // Otherwise sends an error
                res.json({ontError:"Individuals not found"});
            }
        })
        .catch(function(err){
            res.json(err);
        });
});
// 5.1.2.2.3. Class properties: to retrieve properties that identify individuals of a class
// THE: rdfs:domain, rdfs:range, owl:datatypeProperty, owl:objectProperty
// THE: to identify how to instantiate an individual to a class
// IMP: given a class name, returns properties in json format
// IMP: returns empty properties if do not exist
// UPG: to extend class declaration with owl language elements (e.g. owl:cardinality, owl:functionality, etc.)
// UPG: to use owl elements to infer all superclasses a class belong to identify the properties to instantiate an individual to the class
app.get('/api/ontologies/:ontologyName/class/:className/properties', function(req,res){
    let uriElement = constructURI(req.params.ontologyName, req.params.className);
    session
    // Matches owl__Class nodes with owl__ObjectProperty and owl__DatatypeProperty nodes and with other class nodes by rdfs:domain and rdfs:range
        .run(`MATCH (a:owl__Class{uri:"${uriElement}"}) OPTIONAL MATCH (a)<-[r:rdfs__domain]-(b)-[s:rdfs__range]->(c) WHERE b:owl__ObjectProperty OR b:owl__DatatypeProperty RETURN a.uri,labels(b),b.uri,c.uri`)
        .then(function(result){
            // Evaluates if the server contains nodes that match the class
            if (result.records.length !== 0) {
                // Evaluates if class has properties assigned
                if (result.records[0]._fields[1] !== null) {
                    let propertyTypesArray = [];
                    let propertiesArray = [];
                    // Returns the rdfs and owl types of a given property
                    result.records.forEach(function(record){
                        record._fields[1].forEach(function(type){
                            if(returnNeo4jNameElement('owl',type) !== null ) {
                                // propertyTypesArray.push(returnNeo4jNameElement('owl',type));
                                propertyTypesArray.push(returnURIfromNeo4jElement(type));
                            } else {}
                        });
                        // Captures additional property data in json format
                        propertiesArray.push({
                            // Record fields are declared according to cypher response structure
                            // name: returnUriElement(record._fields[2]),
                            // range: returnUriElement(record._fields[3]),
                            // UPG: assumes only one property type is found [0], needs to be ensured
                            ontName: record._fields[2],
                            ontRange: record._fields[3],
                            ontType: propertyTypesArray[0]
                        });
                        // Regenerate propertyTypesArray for new property to be pushed into the array
                        propertyTypesArray = [];
                    });
                    // Returns class and properties in json format
                    res.json({ontClass: uriElement, ontProperties: propertiesArray});
                } else {
                    // Otherwise returns a class with empty properties
                    res.json({ontClass: uriElement, ontProperties: []});
                }

            } else {
                // Otherwise sends an error
                res.json({ontError:"Properties not found"});
            }
        })
        .catch(function(err){
            res.json(err);
        });
});
// 5.1.2.2.4. Classes distance: to retrieve minimum distance between two classes
// THE: owl:ObjectProperty | to identify relationships between two classes and calculate their distance
// IMP: uses neosemantics notation (ontology__element) to identify classes and object properties
// IMP: assumes all object properties considered belong to a specific ontology
// UPG: to extend to different type of distances being calculated
app.get('/api/ontologies/:ontologyStartName/class/:classStartName/distance/:ontologyDistanceName/:ontologyEndName/class/:classEndName', function(req,res){
    // Check the cases when classes are equal and distance should be zero.
    if (req.params.ontologyStartName === req.params.ontologyEndName && req.params.classStartName === req.params.classEndName) {
        // Builds uri resources for classes constructed
        let classStartURI = constructURI(req.params.ontologyStartName, req.params.classStartName);
        let classEndURI = constructURI(req.params.ontologyEndName, req.params.classEndName);
        // Builds json object to send distance between two classes
        res.json({ontStartClass: classStartURI, ontEndClass: classEndURI, ontDistance: "0"});
    }
    else {
        session
        // Matches all individual nodes instantiated by the given classes
        // Return the minimum length of the shortest paths found between those two sets of nodes
            .run(`MATCH (a:${req.params.ontologyStartName}__${req.params.classStartName}),
        (b:${req.params.ontologyEndName}__${req.params.classEndName}),p = shortestPath((a)-[*]-(b)) 
        WHERE ALL (r in relationships(p) WHERE type(r) STARTS WITH "${req.params.ontologyDistanceName}")
        RETURN min(length(p))`)
            .then(function(result){
                // Evaluates if query result is null
                if (result.records[0]._fields[0] !== null) {
                    // Builds uri resources for classes constructed
                    let classStartURI = constructURI(req.params.ontologyStartName, req.params.classStartName);
                    let classEndURI = constructURI(req.params.ontologyEndName, req.params.classEndName);
                    // Parses number retrieved from neo4j to string
                    let classesDistance = result.records[0]._fields[0].low.toString();
                    // Builds json object to send distance between two classes
                    res.json({ontStartClass: classStartURI, ontEndClass: classEndURI, ontDistance: classesDistance});
                } else {
                    // Otherwise sends an error
                    res.json({ontError:"Distance not found"});
                }

            })
            .catch(function(err){
                res.json(err);
            });
    }
});

// 5.1.2.3. Individual-level GET requests:
// 5.1.2.3.1. Individual properties: to identify the properties that describe an individual in an ontology
// THE: owl:NamedIndividual | to identify an individual by the properties and values used to declare it
// IMP: given an ontology and an individual name, returns its properties in json format
// IMP: returns empty properties if do not exist
// IMP: evaluates datatype (properties) and object (relationship) properties using neosemantics notation
// UPG: to extent evaluation of properties being declared by other ontologies
// UPG: to extend property declaration including domain and range of each property returned
// UPG: to extend evaluation of properties retrieved by the ontology being consulted (ontology__Property)
app.get('/api/ontologies/:ontologyName/individual/:individualName/properties', function(req,res){
    let uriElement = constructURI(req.params.ontologyName, req.params.individualName);
    // Variables to capture elements independently due to the message structure retrieved by the cypher query
    let classArray;
    // Object properties are stored differently than data properties as they require different capture methods
    let dataPropertiesArray = [];
    let objectPropertiesArray = [];
    session
        // Matches node by uri and owl__NamedIndividual label and returns classes (labels), and datatype (properties) and object (relations{type}) properties
        .run(`MATCH (a:owl__NamedIndividual{uri:"${uriElement}"}) OPTIONAL MATCH (a)-[r]->(b) RETURN a.uri, labels(a), properties(a), type(r), b.uri`)
        .then(function(result){
            // Evaluates if the server contains nodes that match the class
            if (result.records.length !== 0) {
                // Evaluates neo4j results using their array indexes
                result.records.forEach(function(record, index, array){
                    // Some fields in each record include repeated data, these need pre-processing
                    // Pre-processing is not elegant as it repeats the same operation more than needed
                    // Conditional clause included to avoid replication, only get results from first record
                    if (Object.is(array.length - 1, index)) {
                        // Returns class name only from first property as it is always the same
                        record._fields[1].forEach(function(label) {
                            if (returnNeo4jNameElement(req.params.ontologyName, label) !== null) {
                                // classArray = returnNeo4jNameElement(req.params.ontologyName, label);
                                classArray = returnURIfromNeo4jElement(label);
                            } else {}
                        });
                        // Returns datatype property name and value for each property retrieved by neo4j
                        let dataPropertiesKeys = Object.keys(record._fields[2]);
                        dataPropertiesKeys.forEach(function(dataPropertyKey){
                            // Considers the case where data properties are null
                            // Avoids data properties which do not belong to the ontology being queried
                            if(returnNeo4jNameElement(req.params.ontologyName,dataPropertyKey) !== null) {
                                dataPropertiesArray.push({
                                    // name: returnNeo4jNameElement(req.params.ontologyName,dataPropertyKey),
                                    // value: record._fields[2][dataPropertyKey]
                                    ontName: returnURIfromNeo4jElement(dataPropertyKey),
                                    ontValue: record._fields[2][dataPropertyKey],
                                    ontType: classOntologyURI + "#" + "DatatypeProperty"
                                });
                            } else {}
                        });
                    }
                    // Returns object property name and value for each property retrieved by neo4j
                    // Considers the case where object properties are null
                    if (record._fields[3] !== null ) {
                        objectPropertiesArray.push({
                            // name: returnNeo4jNameElement(req.params.ontologyName,record._fields[3]),
                            // value: returnUriElement(record._fields[4])
                            ontName: returnURIfromNeo4jElement(record._fields[3]),
                            ontValue: (record._fields[4]),
                            ontType: classOntologyURI + "#" + "ObjectProperty"
                        });
                    } else {}
                });
                // Returns individual name, class name, and properties (datatype and object concatenated) name and value in json format
                // res.json({individual: req.params.individualName, class: classArray, properties: dataPropertiesArray.concat(objectPropertiesArray)});
                res.json({ontIndividual: uriElement, ontClass: classArray, ontProperties: dataPropertiesArray.concat(objectPropertiesArray)});
            } else {
                // Otherwise sends an error
                res.json({ontError:"Individual not found"});
                // res.error()
            }
        })
        .catch(function(err){
            res.json(err);
        });
});
// 5.1.3. Ontology view GET requests
// UPG: to visualise ontology in web browsers in a friendly manner and meet normal semantic web visualisations ("#")
// UPG: given an ontology name, retrieve the ontology ("http://138.250.108.1:3003/api/files/ontologies/rtrbau#")
// UPG: given an ontology element name, retrieve the element ("http://138.250.108.1:3003/api/files/ontologies/rtrbau#element")
// 5.1.4. ControlMonitoring GET requests:
// IMP: since SPARQL endpoint is not done, we need specific interfaces for each module to query data properly
// IMP: given an ontology, two classes, one relation and one attribute of datetime type
// IMP: retrieves latest individual from the second class with the latest datetime attribute
// UPG: add a SPARQL query system that acts as interface between modules and ontology database
app.get('/api/cm/:ontologyName/class/:firstClassName/individual/:individualName/relation/:relationshipName/class/:secondClassName/attribute/:orderingAttributeName/attribute/:requiredAttribute', function(req,res) {
    let uriElement = constructURI(req.params.ontologyName, req.params.individualName);
    session
        .run(`MATCH (n:${req.params.ontologyName}__${req.params.firstClassName}{uri:"${uriElement}"})<-[r:${req.params.ontologyName}__${req.params.relationshipName}]-(m:${req.params.ontologyName}__${req.params.secondClassName}) 
        RETURN m.${req.params.ontologyName}__${req.params.orderingAttributeName},m.${req.params.ontologyName}__${req.params.requiredAttribute} 
        ORDER BY datetime(m.${req.params.ontologyName}__${req.params.orderingAttributeName}) DESC LIMIT 1`)
        .then(function(result){
            if (result.records[0]._fields[0] !== null) {
                res.json({
                    ontProperty: req.params.firstClassName,
                    ontOntology: req.params.ontologyName,
                    ontMeasure: req.params.secondClassName,
                    ontResults: [{
                        ontName: req.params.orderingAttributeName,
                        ontValue: result.records[0]._fields[0]
                    }, {
                        ontName: req.params.requiredAttribute,
                        ontValue: result.records[0]._fields[1]
                    }]
                })
            } else {
                res.json({ontError:"Not found"});
            }
        })
        .catch(function(err){
            res.json(err);
        });
});
// 5.2. POST REQUESTS
// 5.2.1. File POST requests
// UPG: to include upload of files {ontologies, images, 3Dmodels} with user authentication
// 5.2.3. Ontology view POST requests
// UPG: to include upload of complete ontologies with consistency evaluation
// 5.2.2. Ontology POST requests
// 5.2.2.1. Ontology-level POST requests:
// UPG: to input a new ontology in neo4j ontology schema graph, including namespace prefix definition, and class, datatype and object nodes
// 5.2.2.2. Class-level POST requests:
// UPG: to input a new class in neo4j graphs, including nodes in schema graph and class, datatype and object property labels
// 5.2.2.3. Individual-level POST requests:
// 5.2.2.3.1. Individual input: to input an individual in the ontology graph after consistency evaluation
// THE: rdfs:domain, rdfs:range, owl:NamedIndividual
// THE: evaluates individual to instantiate by properties based on current implemented rdfs language rules
// THE: consistency evaluation | rdfs rules: class existence, domain correctness, range correctness
// IMP: consistency evaluation | additional rules: name correctness, class properties lack, object property value existence
// IMP: additional rules are not required from a theoretical perspective but helps with ontology maintainability
// IMP: given a complete individual, evaluate consistency against schema, input individual in ontology schema and return input and warnings or errors and warnings
// IMP: implements promises to make sure all consistency evaluations are satisfied (resolved or rejected) before instantiating individual
// IMP: user cypher "MERGE" instruction to avoid individual re-instantiation
// UPG: to extend individual instantiation to classes of other ontologies where the individual has been replicated
// UPG: to extend consistency evaluation with owl language elements once implemented with neosemantics notation
app.post('/api/ontologies/:ontologyName/individual/:individualName/input', function(req,res){
    // let uriElement = ontologiesURI + req.params.ontologyName + "#";
    // Individual input consists of several procedures:
    // A. Consistency evaluation: to assess if the individual matches the class schema to which being instantiated
    // B. Individual instantiation: to input the individual within the neo4j ontology graph
    // C. Resolution: returns the input success and warnings, or the errors and warnings found
    // IMP: the code uses promises to ensure all evaluations are conducted before resolving or rejecting the instantiation
    // IMP: considers as input an individual in json format: {name:,class:,ontology:,properties:[{name:,value:,domain:,range:}]}
    // IMP: a final promise is run to resolve or reject instantiation based on consistency results
    // IMP: promises are run in concurrency, avoiding rejection of some promises to affect others
    // UPG: to manage rejection of promises which theoretically may affect other evaluations
    // UPG: to modify consistency evaluation results for simplifying their evaluation
    // A. CONSISTENCY EVALUATION
    // THE: evaluations have been classified according to compliance with rdfs rules or maintainability
    // IMP: evaluations can be made at individual or property level, this classification is used to present the code
    // IMP: evaluations all return same json object {success/error/warning:{level:,name:,evaluation:,value:}}
    // UPG: to extend evaluations to cover owl ontology description
    // A.1. Property-level consistency evaluations:
    // IMP: uses a property json object as declared for the post method
    // A.1.1. RDFS rules evaluation:
    // A.1.1.1. Domain correctness: to evaluate if the property domain in the ontology schema is as declared by the individual
    // THE: rdfs:domain | compares the individual declaration against the class as described in the ontology schema
    // IMP: promises to return as a json object the result of the evaluation
    let propertyDomain = function(individualProperty){
        return new Promise(function(resolve, reject){
            // Variables to identify the uri's of the elements involved
            // const propertyURI = uriElement + individualProperty["name"];
            // const domainURI = uriElement + individualProperty["domain"];
            // console.log("domainExistence: " + individualProperty["name"]);
            session
                // Matches the existence of the domain for the property
                // .run(`MATCH (a{uri:"${propertyURI}"})-[r:rdfs__domain]->(b{uri:"${domainURI}"}) RETURN a.uri,b.uri`)
                .run(`MATCH (a{uri:"${individualProperty["ontName"]}"})-[r:rdfs__domain]->(b{uri:"${individualProperty["ontDomain"]}"}) RETURN a.uri,b.uri`)
                .then(function(results){
                    // Resolves with a success or an error json object
                    if (results.records.length !== 0) {
                        resolve ({ontSuccess:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"domainCorrectness",ontValue:individualProperty["ontDomain"]}});
                    } else {
                        resolve ({ontError:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"domainCorrectness",ontValue:individualProperty["ontDomain"]}});
                    }
                })
                // Rejection is used to cope with neo4j related errors
                .catch(function(error){
                    reject(error);
                });
        });
    };
    // A.1.1.2. Range correctness: to evaluate if the property range in the ontology schema is as declared by the individual
    // THE: rdfs:range | compares the individual declaration against the class as described in the ontology schema
    // IMP: promises to return as a json object the result of the evaluation
    let propertyRange = function(individualProperty){
        return new Promise(function(resolve, reject){
            // const propertyURI = uriElement + individualProperty["name"];
            // let rangeURI = returnURI(individualProperty["range"]);
            // // For datatype properties, built-in datatypes (outside ontology) to be given the correct uri
            // // UPG: to include additional datatypes from other ontologies rather than xsd
            // function returnURI(element){
            //     const xsdRanges = ["anyURI","base64binary","boolean","byte","dateTime","dateTimeStamp","decimal","double","float","hexBinary","int","integer","language","long","Name","NCName","negativeInteger","NMTOKEN","nonNegativeInteger","nonPositiveInteger","normalizedString","positiveInteger","short","string","token","unsignedByte","unsignedInt","unsignedLong","unsignedShort"];
            //     if(xsdRanges.includes(element)){
            //         return datatypeOntologyURI + "#" + element;
            //     } else {
            //         return uriElement + element;
            //     }
            // }
            // console.log("rangeExistence: " + individualProperty["name"]);
            session
                // Matches the existence of the property range
                // .run(`MATCH (a{uri:"${propertyURI}"})-[r:rdfs__range]->(b{uri:"${rangeURI}"}) RETURN a.uri,b.uri`)
                .run(`MATCH (a{uri:"${individualProperty["ontName"]}"})-[r:rdfs__range]->(b{uri:"${individualProperty["ontRange"]}"}) RETURN a.uri,b.uri`)
                .then(function(results){
                    // Resolves for the property range according to evaluation json object
                    if (results.records.length !== 0) {
                        resolve ({ontSuccess:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"rangeCorrectness",ontValue:individualProperty["ontRange"]}});
                    } else {
                        resolve ({ontError:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"rangeCorrectness",ontValue:individualProperty["ontRange"]}});
                    }
                })
                .catch(function(error){
                    reject(error);
                });
        });
    };
    // A.1.2. Maintainability evaluation:
    // A.1.2.1. Property existence: to evaluate if the property to be instantiated exists
    // THE: rdfs:Resource | compares the uri's element against those existing in the knowledge base
    // IMP: uses the element's uri to identify it is has been declared in the neo4j graph
    // UPG: to check if it exists for the specific ontology to which the class being instantiated belongs
    let propertyExistence = function(individualProperty){
        return new Promise(function(resolve, reject){
            // const propertyURI = uriElement + individualProperty["name"];
            // console.log("propertyExistence: " + individualProperty["name"]);
            session
                // Matches the existence of the property by URI
                // .run(`MATCH (n{uri:"${propertyURI}"}) RETURN n`)
                .run(`MATCH (n{uri:"${individualProperty["ontName"]}"}) RETURN n`)
                .then(function(results){
                    // Resolves for the property name according to evaluation json object
                    if (results.records.length !== 0) {
                        resolve ({ontSuccess:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"propertyExistence",ontValue:individualProperty["ontName"]}});
                    } else {
                        resolve ({ontError:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"propertyExistence",ontValue:individualProperty["ontName"]}});
                    }
                })
                .catch(function(error){
                    reject(error);
                });
        });
    };
    // A.1.2.2. Property value existence: to evaluate if the individual value to be instantiated exists
    // THE: rdfs:Resource | compares the uri's element against those existing in the knowledge base
    // IMP: evaluates only object type property values
    // UPG: to extend to datatype property values using generic rules (e.g. int or double)
    let propertyValue = function(individualProperty){
        return new Promise(function(resolve, reject){
            // const valueURI = uriElement + individualProperty["value"];
            // const propertyTypes = [];
            // console.log("valueExistence: " + individualProperty["name"]);
            // console.log("valueExistence: " + returnUriElement(individualProperty["ontType"]).includes("ObjectProperty"));
            // Identifies the types of the property being evaluated
            // individualProperty["types"].forEach(function(type){
            //     if(returnNeo4jNameElement('owl',type) !== null ) {
            //         propertyTypes.push(returnNeo4jNameElement('owl',type));
            //     } else {}
            // });
            // individualProperty["ontTypes"].forEach(function(type){
            //     if(returnUriElement(type) !== null ) {
            //         propertyTypes.push(returnUriElement(type));
            //     } else {}
            // });
            // Evaluates only if the property is of object or datatype types, otherwise error
            // if (propertyTypes.includes("ObjectProperty")) {
            if (returnUriElement(individualProperty["ontType"]).includes("ObjectProperty")) {
                session
                    // Matches the existence of the property value by URI
                    // .run(`MATCH (n{uri:"${valueURI}"}) RETURN n`)
                    .run(`MATCH (n{uri:"${individualProperty["ontValue"]}"}) RETURN n`)
                    .then(function(results){
                        if (results.records.length !== 0) {
                            resolve ({ontSuccess:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"valueExistence",ontValue:individualProperty["ontValue"]}});
                        } else {
                            resolve ({ontError:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"valueExistence",ontValue:individualProperty["ontValue"]}});
                        }
                    })
                    .catch(function(error){
                        reject(error);
                    });
            } else if (returnUriElement(individualProperty["ontType"]).includes("DatatypeProperty")) {
                // Evaluates if property value exists (is not null) when is not of object type
                // UPG: to include a rejection for the promise as it is missing
                if (individualProperty["ontValue"]!==null) {
                    resolve ({ontSuccess:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"valueExistence",ontValue:individualProperty["ontValue"]}});
                } else {
                    resolve ({ontError:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"valueExistence",ontValue:individualProperty["ontValue"]}});
                }
            } else {
                // Returns error because no support property ype has been found
                resolve ({ontError:{ontLevel:"property",ontName:individualProperty["ontName"],ontEvaluation:"supportedType",ontValue:individualProperty["ontValue"]}});
            }
        });
    };
    // A.1.3. Property evaluation: to run all consistency evaluations for a given property
    // IMP: promises are run concurrently without affecting each to return all evaluation results
    // IMP: catches rejections of embedded properties to avoid next promise stopping
    // UPG: to run promises sequentially when results can affect but retrieving all results at the end
    // UPG: to modify order of promises to comply with sequential evaluation rules
    let propertyConsistency = async function (individualProperty) {
        // console.log("propertyConsistency");
        return await Promise.all([propertyDomain(individualProperty),propertyRange(individualProperty),propertyExistence(individualProperty),propertyValue(individualProperty)].map(p => p.catch(error => error)));
    };
    // A.2. Individual-level consistency evaluations:
    // IMP: uses an individual json object as declared for the post method
    // A.2.1. RDFS rules evaluation:
    // IMP: includes evaluations of maintainability consistency issues to allow promises to be run for each property
    // UPG: to extend individual-level consistency evaluations regarding owl rules
    // A.2.2.1. Class existence evaluation: to evaluate existence of class being instantiated
    let classExistence = function(individual){
        return new Promise(function(resolve, reject){
            // const classURI = uriElement + individual["class"];
            // console.log("classExistence: " + individual["class"]);
            session
                // Matches the existence of the class by URI
                // .run(`MATCH (n{uri:"${classURI}"}) RETURN n`)
                .run(`MATCH (n{uri:"${individual["ontClass"]}"}) RETURN n`)
                .then(function(results){
                    if (results.records.length !== 0) {
                        resolve ({ontSuccess:{ontLevel:"individual",ontName:individual["ontName"],ontEvaluation:"classExistence",ontValue:individual["ontClass"]}});
                    } else {
                        resolve ({ontError:{ontLevel:"individual",ontName:individual["ontName"],ontEvaluation:"classExistence",ontValue:individual["ontClass"]}});
                    }
                })
                .catch(function(error){
                    reject(error);
                });
        });
    };
    // A.2.1.2. Properties evaluation: to evaluate correctness of individual properties being instantiated
    // IMP: maps the property evaluation promise to all properties declared by the individual
    let individualPropertiesConsistency = async function (individual) {
        // console.log("individualPropertiesConsistency");
        return await Promise.all(individual["ontProperties"].map(propertyConsistency));
    };
    // A.2.2. Maintainability evaluation:
    // A.2.2.1. Ontology name correctness: to evaluate the correctness of the individual being instantiated
    // IMP: compares the ontology name given by the post body and the post request parameters
    let ontologyName = function(individual) {
        return new Promise(function(resolve){
            // if (individual["ontology"]===req.params.ontologyName){
            const uriElement = ontologiesURI + req.params.ontologyName + "#";
            if (individual["ontOntology"]===uriElement){
                resolve ({ontSuccess:{ontLevel:"individual",ontName:individual["ontName"],ontEvaluation:"ontologyCorrectness",ontValue:individual["ontOntology"]}});
            } else {
                resolve ({ontError:{ontLevel:"individual",ontName:individual["ontName"],ontEvaluation:"ontologyCorrectness",ontValue:individual["ontOntology"]}});
            }
        });
    };
    // A.2.2.2. Individual name correctness: to evaluate the correctness of the individual being instantiated
    // IMP: compares the individual name given by the post body and the post request parameters
    // UPG: to extend name evaluation to specific naming conventions of certain classes
    let individualName = function(individual) {
        return new Promise(function(resolve){
            // if (individual["name"]===req.params.individualName){
            // const uriElement = ontologiesURI + req.params.ontologyName + "#" + req.params.individualName;
            let uriElement = constructURI(req.params.ontologyName, req.params.individualName);
            if (individual["ontName"]===uriElement){
                resolve ({ontSuccess:{ontLevel:"individual",ontName:individual["ontName"],ontEvaluation:"nameCorrectness",ontValue:individual["ontName"]}});
            } else {
                resolve ({ontError:{ontLevel:"individual",ontName:individual["ontName"],ontEvaluation:"nameCorrectness",ontValue:individual["ontName"]}});
            }
        });
    };
    // A.2.2.3. Class properties lack: to warn about class properties not being instantiated by the individual
    // THE: owl:Cardinality | to evaluate if class properties are missing in individual instantiation
    // THE: antagonist evaluation of domain correctness at individual level (missing <-> extra)
    // IMP: does not resolve errors, only warnings on missing properties
    // UPG: to extend to error resolve using owl rules (e.g. owl:cardinality)
    let classPropertiesLack = function(individual){
        return new Promise(function(resolve, reject){
            // const classURI = uriElement + individual["class"];
            // console.log("classPropertiesLack: " + individual["class"]);
            session
                // Matches properties declared for the class
                // .run(`MATCH (a:owl__Class{uri:"${classURI}"})<-[r:rdfs__domain]-(b) WHERE b:owl__ObjectProperty OR b:owl__DatatypeProperty RETURN a.uri,b.uri`)
                .run(`MATCH (a:owl__Class{uri:"${individual["ontClass"]}"})<-[r:rdfs__domain]-(b) WHERE b:owl__ObjectProperty OR b:owl__DatatypeProperty RETURN a.uri,b.uri`)
                .then(function(results){
                    // Variables to manage individual and class properties names
                    let individualPropertiesNames = [];
                    let classPropertiesNames = [];
                    // Returns individual properties names
                    individual["ontProperties"].forEach(function(individualProperty){individualPropertiesNames.push(individualProperty["ontName"])});
                    // Returns class properties names
                    // results.records.forEach(function(record){classPropertiesNames.push(returnUriElement(record._fields[1]))});
                    results.records.forEach(function(record){classPropertiesNames.push(record._fields[1])});
                    // Filters class properties missing at individual declaration
                    let missingPropertiesNames = classPropertiesNames.filter(function(propertyName){return !individualPropertiesNames.includes(propertyName)});
                    // Resolves a warning with missing properties for the individual
                    resolve ({ontWarning:{ontLevel:"individual",ontName:individual["ontName"],ontEvaluation:"propertiesLack",ontValue:missingPropertiesNames}})
                })
                .catch(function(error){
                    reject(error);
                });
        });
    };
    // A.2.3. Individual evaluation:
    // A.2.3.1. Individual assessment: to run all consistency evaluation promises for a given individual
    // IMP: runs promises concurrently according to declaration order
    // IMP: catches rejections to avoid next promises to stop working
    // UPG: to modify sequential order for running promises that may affect others
    let individualConsistency = async function (individual) {
        // console.log("individualConsistency");
        return await Promise.all([classExistence(individual),individualPropertiesConsistency(individual),ontologyName(individual),individualName(individual),classPropertiesLack(individual)].map(p => p.catch(error => error)));
    };
    // A.2.3.2. Individual evaluation: to assess results of concurrent promises run at individual and property levels
    // IMP: awaits for resolve evaluation results and organises them according to success, errors and warnings
    // IMP: considers concurrent order in which previous promise returns results
    let individualEvaluation = function(individual) {
        return new Promise(function(resolve, reject){
            // console.log("individualEvaluation");
            individualConsistency(individual)
                .then(function(results) {
                    let successes = [];
                    let errors = [];
                    let warnings = [];
                    // Class existence
                    evaluateSuccess(results[0],successes,errors,warnings);
                    // Individual properties
                    results[1].forEach(function(property){
                        property.forEach(function(element){
                            evaluateSuccess(element,successes,errors,warnings);
                        });
                    });
                    // Ontology name
                    evaluateSuccess(results[2],successes,errors,warnings);
                    // Individual name
                    evaluateSuccess(results[3],successes,errors,warnings);
                    // Class properties lack
                    evaluateSuccess(results[4],successes,errors,warnings);
                    // Resolves a json object including success, errors and warning results of consistency evaluations
                    resolve({ontSuccesses: successes, ontErrors: errors, ontWarnings: warnings});
                    // IMP: evaluates results according to promise return json objects for each evaluation
                    function evaluateSuccess (item,successes,errors,warnings) {
                        if (item["ontSuccess"]) {
                            return successes.push(item["ontSuccess"]);
                        } else if (item["ontError"]) {
                            return errors.push(item["ontError"]);
                        } else if (item["ontWarning"]) {
                            return warnings.push(item["ontWarning"]);
                        } else {}
                    }
                })
                .catch(function(error) {
                    reject(error);
                });
        });
    };
    // B. INDIVIDUAL INSTANTIATION
    // THE: to generate an individual and then assign all the values to the properties being instantiated
    // IMP: follows same code structure as individual evaluation (property and individual levels)
    // IMP: instantiation follows neo4j-neosemantics structure and notation
    // IMP: generates a node, including class labels, and then instantiate properties
    // IMP: properties are instantiated as node properties (data type) or as nodes with ontology relations (object type)
    // B.1. Property-level instantiations: to instantiate a property value to an individual
    // IMP: given the individual name, ontology name and the property (json object) instantiates the property to the individual
    // IMP: differentiates between datatype (node property) and object type (relation and node) properties
    let individualPropertyCreation = function (individualName,individualOntology,individualProperty) {
        return new Promise(function(resolve, reject){
            // console.log("individualPropertyCreation");
            // Variables to manage uri names
            let ontologyName = req.params.ontologyName;
            let propertyName = returnUriElement(individualProperty["ontName"]);
            // Variable to manage property types
            // let propertyTypes = [];
            // Variable to manage cypher instantiation query
            let sessionQuery;
            // Evaluates property types
            // individualProperty["types"].forEach(function(type){
            //     if(returnNeo4jNameElement('owl',type) !== null ) {
            //         propertyTypes.push(returnNeo4jNameElement('owl',type));
            //     } else {}
            // });
            // individualProperty["ontType"].forEach(function(type){
            //     if(returnUriElement(type) !== null ) {
            //         propertyTypes.push(returnUriElement(type));
            //     } else {}
            // });
            // if (propertyTypes.includes("DatatypeProperty")) {
            if (returnUriElement(individualProperty["ontType"]).includes("ObjectProperty")) {
                // Matches individual by URI and merges new relation with existing individual
                // sessionQuery = `MATCH (a{uri:"${uriElement+individualName}"}),(b{uri:"${uriElement+individualProperty["value"]}"}) MERGE (a)-[r:${individualOntology}__${individualProperty["name"]}]->(b) RETURN a,r,b`
                sessionQuery = `MATCH (a{uri:"${individualName}"}),(b{uri:"${individualProperty["ontValue"]}"}) MERGE (a)-[r:${ontologyName}__${propertyName}]->(b) RETURN a,r,b`;
            // } else if (propertyTypes.includes("ObjectProperty")) {
            } else if (returnUriElement(individualProperty["ontType"]).includes("DatatypeProperty")) {
                // Matches individual by URI and sets a new node property
                // sessionQuery = `MATCH (n{uri:"${uriElement+individualName}"}) SET n.${individualOntology}__${individualProperty["name"]}="${individualProperty["value"]}" RETURN n`;
                sessionQuery = `MATCH (n{uri:"${individualName}"}) SET n.${ontologyName}__${propertyName}="${individualProperty["ontValue"]}" RETURN n`;
            } else {}
            session
                // Runs cypher query and resolve results
                .run(sessionQuery)
                .then(function(results){
                    resolve(results);
                })
                .catch(function(error){
                    reject (error);
                });
        });
    };
    // B.2. Individual-level instantiations:
    // B.2.1. Individual instantiation: to generate the node in knowledge base graph representing the new individual
    // IMP: uses neosemantics notation to merge node as owl:NamedIndividual and as of ontology class
    let individualNodeCreation = function (individual) {
        return new Promise(function(resolve, reject){
            // console.log("individualNodeCreation");
            // console.log(`MERGE (n:Resource:owl__NamedIndividual:${individual["ontology"]}__${individual["class"]}{uri:"${uriElement+individual["name"]}"}) RETURN n`);
            // Variables to manage uri names
            let ontologyName = req.params.ontologyName;
            let className = returnUriElement(individual["ontClass"]);
            session
                // Merges individual as node by URI
                // .run(`MERGE (n:Resource:owl__NamedIndividual:${individual["ontology"]}__${individual["class"]}{uri:"${uriElement+individual["name"]}"}) RETURN n`)
                .run(`MERGE (n:Resource:owl__NamedIndividual:${ontologyName}__${className}{uri:"${individual["ontName"]}"}) RETURN n`)
                .then(function(results){
                    resolve (results);
                })
                .catch(function(error){
                    reject (error);
                })
        });
    };
    // B.2.2. Properties instantiations: to generate all properties that identifies the new individual
    // IMP: promises instantiation of all individual properties
    let individualPropertiesInstantiation = async function (individual) {
        // console.log("individualPropertiesInstantiation");
        return await Promise.all(individual["ontProperties"].map(function(property){return individualPropertyCreation(individual["ontName"],individual["ontOntology"],property)}));
    };
    // C. RESOLUTION
    // C.1. Individual review: promises to assess individual and its properties against all consistency evaluations
    let individualReview = async function (individual) {
        // console.log("individual");
        return await individualEvaluation(individual);
    };
    // C.2. Individual instantiation: promises to instantiate individual and its properties in neo4j knowledge base graph
    let individualInstantiation = async function (individual) {
        // console.log("individualInstantiation");
        let individualNodeInstantiation = await individualNodeCreation(individual);
        let individualPropsInstantiation = await individualPropertiesInstantiation(individual);
        return await [individualNodeInstantiation,individualPropsInstantiation];
    };
    // C.3. Individual input: to input individual into knowledge base graph according to evaluation results
    // IMP: awaits for individual review resolution to run promise on individual instantiation and return successes/errors/warnings
    // UPG: to modify function as a new promise that can be easily exported
    individualReview(req.body)
        .then(function(reviewResults){
            if (reviewResults["ontErrors"].length!==0){
                // console.log("Errors");
                res.send({ontWarnings:reviewResults["ontWarnings"],ontErrors:reviewResults["ontErrors"]});
            } else {
                // console.log("No errors");
                individualInstantiation(req.body)
                    .then(function(inputResults){
                        let inputResolution = [];
                        inputResolution.push(inputResults[0]["records"]);
                        inputResults[1].forEach(function(result){inputResolution.push(result["records"])});
                        res.send({ontWarnings:reviewResults["ontWarnings"],ontInput:inputResolution});
                    })
                    .catch(function(inputError){
                        res.send(inputError);
                    });
            }
        })
        .catch(function(reviewError){
            res.send(reviewError);
        });
});
// 5.3. PUT REQUESTS
// 5.4. DELETE REQUESTS
// 6. PORT
// IMP: Initialise port for the server to start listen in
app.listen(port, function(){console.log(`Server listening on port: ${port}`)});
// 7. EXPORT
// IMP: to export the app (express) functions declare as a class
// UPG: when functions declared more generically, class can be exported to be used by other servers
module.export = app;
