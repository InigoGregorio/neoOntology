// File purpose:
// To generate a server that can provide interaction between ontologies
// in a standard format and the rtrbau expert system embedded in AR apps.

// File creation:
// Dependencies for this project have been set up manually in json file,
// according to the following tutorial: https://www.youtube.com/watch?v=snjnJCZhXUM
// neo4j-driver needs v1 because documentation says so: https://neo4j.com/developer/javascript/
// neo4j-driver session structure session {.run()/.then()/.catch()/.close()}

// NAMESPACES
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const neo4j = require('neo4j-driver').v1;

// VARIABLES
const port = process.env.PORT || 8008;
// To be changed once server becomes complete
const ontologiesURI = "http://138.250.108.1:3003/api/ontologies/"

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
// app.get('/api/class/:ontologyName/:className', function(req,res){
//   session
//     //.run(`MATCH (a:owl__Class{rdfs__label:"${req.params.className}"})<-[p:rdfs__domain]-(b) WHERE b:owl__ObjectProperty OR b:owl_DatatypeProperty RETURN b.uri`)
//     .run(`MATCH (a:owl__Class{rdfs__label:"${req.params.className}"})<-[m:rdfs__domain]-(b)-[n:rdfs__range]->(c) WHERE b:owl__ObjectProperty OR b:owl__DatatypeProperty OPTIONAL MATCH (c)-[o:rdfs__subClassOf]->(d) RETURN a.uri,b.uri,c.uri,d.uri`)
//     .then(function(result){
//       var classArray = [];
//       result.records.forEach(function(record){
//         // Need to create a function to add uri instead of rdfs__label for .run()
//         // Need to create a function to split uri by # and return null if does not exist
//         // Need to create a function to retrieve enumerated datatypes if class range is datatype
//         if (record._fields[3] != null) {
//           classArray.push({
//             class: record._fields[0].split("#")[1],
//             property: record._fields[1].split("#")[1],
//             range: record._fields[2].split("#")[1],
//             rangeClass: record._fields[3].split("#")[1]
//           });
//         } else {
//           classArray.push({
//             class: record._fields[0].split("#")[1],
//             property: record._fields[1].split("#")[1],
//             range: record._fields[2].split("#")[1],
//             rangeClass: "null"
//           });
//         }
//
//       });
//       res.send(JSON.stringify(classArray));
//       //console.log(result);
//     })
//     .catch(function(err){
//       console.log(err);
//     });
// })
app.get('/api/class/:ontologyName/:className', function(req,res){
  // Variable to identify relevant uri to look for
  var uriElement = ontologiesURI + req.params.ontologyName + "#" + req.params.className;
  // neo4j query session
  session
    //.run(`MATCH (a:owl__Class{rdfs__label:"${req.params.className}"})<-[p:rdfs__domain]-(b) WHERE b:owl__ObjectProperty OR b:owl_DatatypeProperty RETURN b.uri`)
    .run(`MATCH (a:owl__Class{uri:"${uriElement}"})<-[m:rdfs__domain]-(b)-[n:rdfs__range]->(c) WHERE b:owl__ObjectProperty OR b:owl__DatatypeProperty OPTIONAL MATCH (c)-[o:rdfs__subClassOf]->(d) RETURN a.uri,b.uri,c.uri,d.uri`)
    .then(function(resultA){
      var classArray = [];
      resultA.records.forEach(function(recordA){
        // if (returnUriElement(record._fields[3]) == "Datatype"){
          // Nest additional session to include ontology enumerated datatypes
          // It assumes that when rangeClass is Datatype then is enumerated datatype
          // This assumption is based on ontology development policy followed
          // If not dataArray includes the original range (either Class or non-propietary datatype)
          session
            .run(`MATCH (n) WHERE n:owl__NamedIndividual AND n:${req.params.ontologyName}__${returnUriElement(recordA._fields[2])} RETURN n.uri`)
            .then(function(resultB){
              var enumeratedDatatypes = [];
              resultB.records.forEach(function(recordB){
                enumeratedDatatypes.push(returnUriElement(recordB._fields[0]));
              });
              classArray.push({
                class: returnUriElement(recordA._fields[0]),
                property: returnUriElement(recordA._fields[1]),
                range: enumeratedDatatypes
              });
              //console.log(enumeratedDatatypes);
              //console.log(enumeratedDatatypes.toString());
              //console.log(classArray.toString());
            })
            .catch(function(errB){
              console.log(errB);
            });
            // classArray.push({
            //   class: returnUriElement(record._fields[0]),
            //   property: returnUriElement(record._fields[1]),
            //   //range: enumeratedDatatypes.toString()
            // });
        // } else {
        //   classArray.push({
        //     class: returnUriElement(record._fields[0]),
        //     property: returnUriElement(record._fields[1]),
        //     range: returnUriElement(record._fields[2])
        //   });
        //   console.log(classArray.toString());
        // }
      });
      res.send(JSON.stringify(classArray));
      //console.log(result);
    })
    .catch(function(errA){
      console.log(errA);
    });
})

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
  // If not null, returns element name splitted from uri after "#".
  // Otherwise, returns null.
  if (uri == null) {
    return null;
  } else {
    return uri.split("#")[1];
  }
}

// function returnEnumeratedDatatype (ontologyName, propertyRange) {
//   // Nest additional session to include ontology enumerated datatypes
//   // It assumes that when rangeClass is Datatype then is enumerated datatype
//   // This assumption is based on ontology development policy followed
//   // If not dataArray includes the original range (either Class or non-propietary datatype)
//   var enumeratedDatatypes = [];
//   session
//     .run(`MATCH (n) WHERE n:owl__NamedIndividual AND n:${ontologyName}__${propertyRange} RETURN n.uri`)
//     .then(function(result){
//       result.records.forEach(function(record){
//         enumeratedDatatypes.push(returnUriElement(record._fields[0]));
//       });
//       //console.log(enumeratedDatatypes);
//       return enumeratedDatatypes.toString();
//     })
//     .catch(function(err){
//       console.log(err);
//       return err;
//     });
// }
