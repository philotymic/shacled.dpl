import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import {SHACLValueConstrTypeFactory_ston} from './SHACLClassProperty.js';
import {MyChip, DropdownList} from './misccomponents.js';
import * as utils from './utils.js';

class SuperClassChooser extends React.Component {
    constructor(props) {
	super(props);
	this.state = {superclass_uri: null}
	this.add_superclass = this.add_superclass.bind(this);
    }

    add_superclass() {
	let ib = {};
	ib.class_uri = this.props.dialog.state.class_uri;
	ib.superclass_uri = this.state.superclass_uri;
	ib.g = this.props.dialog.props.shacl_diagram.props.shapes_graph_uri;
	let rq = `insert {
                     graph ?g { ?class_uri rdfs:subClassOf ?superclass_uri }
                     ?class_uri rdfs:subClassOf ?superclass_uri
                  } where {
                  }`;
        console.log("add_superclass:", rq);                      
	let fuseki_prx = this.props.dialog.props.shacl_diagram.fuseki_prx;
	fuseki_prx.update(rq, ib).then(() => this.props.dialog.__refresh_after_update_rq());
	this.props.dialog.setState({subdialog_open: false});
    }
    
    render() {
	return (<div>
		<input type="text" value={this.state.superclass_uri} onChange={e => this.setState({superclass_uri: e.target.value})}/>
		<button onClick={this.add_superclass}>add</button>
	       </div>);
    }
};

class ClassPropertyEditor extends React.Component {
    constructor(props) {
	super(props);
	this.state = {class_property: this.props.class_property}
	this.__update = this.__update.bind(this);
    }

    __update() {
	let ib = {};
	ib.g = this.props.dialog.props.shacl_diagram.props.shapes_graph_uri;
	ib.class_uri = this.props.dialog.state.class_uri;
	ib.old_cp_path = this.props.class_property.path_uri;
	ib.cp_path = this.state.class_property.path_uri;
	ib.cp_vct_uri = SHACLValueConstrTypeFactory_ston.value_constr_types[this.state.class_property.value_constr_type].value_constr_type_uri;
	ib.cp_value_type_uri = this.state.class_property.value_type_uri;
	let rq = `delete {
                    graph ?g {
                      ?cp ?old_cp_pred ?old_cp_obj
                    }
                  } insert {
                    graph ?g {
                      ?cp sh:path ?cp_path; ?cp_vct_uri ?cp_value_type_uri; sh:minCount 1; sh:maxCount 1
                    }
                  } where {
                    graph ?g {
                      ?class_shape sh:targetClass ?class_uri; sh:property ?cp.
                      ?cp sh:path ?old_cp_path.
                      ?cp ?old_cp_pred ?old_cp_obj
                    }
                  }`
	console.log("__update:", rq, ib);
	let fuseki_prx = this.props.dialog.props.shacl_diagram.fuseki_prx;
	fuseki_prx.update(rq, ib).then(() => this.props.dialog.__refresh_after_update_rq());
	this.props.dialog.setState({subdialog_open: false});
    }
    
    render() {
	return (<table><tbody><tr>
		<td><input type="text" value={this.state.class_property.path_uri}
		onChange={e => {
		    let cp = this.state.class_property;
		    cp.path_uri = e.target.value;
		    this.setState({class_property: cp});
		}}/></td>
		<td><DropdownList items={SHACLValueConstrTypeFactory_ston.get_value_constr_types_out_str()}
		                  selected_item={SHACLValueConstrTypeFactory_ston.get_value_constr_type_in_enum_out_str(this.state.class_property.value_constr_type)}
		onChange={v => {
		    let cp = this.state.class_property;
		    cp.value_constr_type = SHACLValueConstrTypeFactory_ston.get_value_constr_type_in_str_out_enum(v);
		    cp.value_type_uri = SHACLValueConstrTypeFactory_ston.get_value_type_uris(cp.value_constr_type)[0];
		    this.setState({class_property: cp});
		}}/></td>
		<td><DropdownList items={SHACLValueConstrTypeFactory_ston.get_value_type_uris(this.state.class_property.value_constr_type)}
		                  selected_item={this.state.class_property.value_type_uri}
		onChange={v => {
		    let cp = this.state.class_property;
		    cp.value_type_uri = v;
		    this.setState({class_property: cp});
		}}/></td>
		<td><button onClick={this.__update}>update</button></td>
		</tr></tbody></table>);
    }
};

export default class SHACLClassEditorDialog extends React.Component {
    constructor(props) {
	super(props);
	this.state = {class_uri: null, new_class_property_path: "", dialog_open: false, subdialog_open: false, subdialog_component: null};

	this.__add_new_class_property = this.__add_new_class_property.bind(this);
	this.__add_superclass = this.__add_superclass.bind(this);
	this.__remove_class_property = this.__remove_class_property.bind(this);
	this.__edit_class_property = this.__edit_class_property.bind(this);
	this.__remove_superclass = this.__remove_superclass.bind(this);
    }

    show_dialog(class_uri) {
	this.setState({...this.state, dialog_open: true, class_uri: class_uri});
    }

    __get_class_property_row(class_property) {
	let ret = (<tr key={utils.generateQuickGuid()}>
		   <td><input type="text" style={{borderWidth: "0px"}} value={class_property.path_uri} readonly/></td>
		   <td><input type="text" value={SHACLValueConstrTypeFactory_ston.get_value_constr_type_in_enum_out_str(class_property.value_constr_type)} style={{borderWidth: "0px"}}/></td>
		   <td><input type="text" style={{borderWidth: "0px"}} value={class_property.value_type_uri} readonly/></td>
		   <td><button onClick={() => this.__edit_class_property(class_property)}>E</button></td>
		   <td><button onClick={() => this.__remove_class_property(class_property)}>X</button></td>
		   </tr>);
	return ret;
    }

    __refresh_after_update_rq() {
	this.props.shacl_diagram.class_view_factory.refresh(null).then(() => {
	    //debugger;
	    let shacl_class_view = this.props.shacl_diagram.class_view_factory.shacl_class_views_objs[this.state.class_uri];	    
	    this.setState({new_class_property_path: ""}, () => {
		this.props.shacl_diagram.load_classes();
		let c_state = this.props.shacl_diagram.class_view_factory.shacl_class_views_objs[this.state.class_uri].state;
		shacl_class_view.forceUpdate();
		//this.props.shacl_diagram.diagram.fit_cell_content(this.state.class_uri);
		console.log('diagram refreshed');
	    });
	});	
    }
    
    __remove_class_property(class_property) {
	let ib = {};
	ib.g = this.props.dialog.shacl_diagram.props.shapes_graph_uri;
	ib.class_property_path_uri = class_property.path_uri;
	ib.class_uri = this.state.class_uri;
	let rq = `delete {
                   graph ?g {
                    ?cp ?p ?o
                   }
                  } where {
                   graph ?g {
                    ?class_shape sh:targetClass ?class_uri; sh:property ?cp.
                    ?cp sh:path ?class_property_path_uri.
                    ?cp ?p ?o
                    }
                  }`
	console.log("__remove_class_property:", rq, ib);
	let fuseki_prx = this.props.shacl_diagram.class_view_factory.fuseki_prx;
	fuseki_prx.update(rq, ib).then(() => this.__refresh_after_update_rq());
    }

    __edit_class_property(class_property) {
	console.log("__edit_class_property");
	this.setState({subdialog_open: true, subdialog_component: (<ClassPropertyEditor dialog={this} class_property={class_property}/>)});
    }
    
    __add_new_class_property() {
	// if (this.state.new_class_property in ... -- check if such cprop already exists
	debugger;
	let ib = {};
	ib.g = this.props.shacl_diagram.props.shapes_graph_uri;
	ib.class_property_path = this.state.new_class_property_path;
	ib.class_uri = this.state.class_uri;
	let rq = `insert { 
                   graph ?g { 
                    ?class_shape sh:property _:class_property.
                    _:class_property sh:path ?class_property_path; 
                                    sh:datatype xsd:string; 
                                    sh:minCount 1; sh:maxCount 1
                   }
                  } where {
                    graph ?g {
                      ?class_shape sh:targetClass ?class_uri
                    }
                  }`;

	console.log("__add_new_class_property:", rq, ib);
	let fuseki_prx = this.props.shacl_diagram.class_view_factory.fuseki_prx;
	fuseki_prx.update(rq, ib).then(() => this.__refresh_after_update_rq());
    }

    __add_superclass() {
	console.log("__add_superclass");
	this.setState({subdialog_open: true, subdialog_component: (<SuperClassChooser dialog={this}/>)});
    }

    __remove_superclass(key) {
	//debugger;
	console.log("__remove_superclass");
	let shacl_class_view = this.props.shacl_diagram.class_view_factory.shacl_class_views_objs[this.state.class_uri];
	let ib = {};
	ib.g = this.props.dialog.shacl_diagram.props.shapes_graph_uri;
	ib.class_uri = this.state.class_uri;
	ib.superclass_uri = key;
	let rq = `delete {
                   graph ?g { ?class_uri rdfs:subClassOf ?superclass_uri }
                   ?class_uri rdfs:subClassOf ?superclass_uri
                  } where {
                  }`;
	console.log("__remove_superclass:", rq, ib);
	let fuseki_prx = this.props.shacl_diagram.class_view_factory.fuseki_prx;
	fuseki_prx.update(rq, ib).then(() => this.__refresh_after_update_rq());
    }
    
    render() {
	let class_property_rows = null;
	let superclasses = null;
	let shacl_class_view = this.props.shacl_diagram.class_view_factory.shacl_class_views_objs[this.state.class_uri];
	if (shacl_class_view) {
	    superclasses = shacl_class_view.get_superclass_uris().map(x => (<MyChip label={x} onDelete={this.__remove_superclass}/>));
	    class_property_rows = shacl_class_view.get_class_properties().map(x => this.__get_class_property_row(x));
	}
	
	return (
	    	<Dialog onClose={(v) => { this.setState({dialog_open: false}); }} aria-labelledby="simple-dialog-title" open={this.state.dialog_open}>
		<DialogTitle>{this.state.class_uri}</DialogTitle>

		 <Dialog onClose={(v) => { this.setState({subdialog_open: false}); }} aria-labelledby="simple-dialog-title" open={this.state.subdialog_open}>
		 <DialogTitle>subdialog</DialogTitle>
		 {this.state.subdialog_component}
		 </Dialog>
		 
		<div>{superclasses}<button onClick={this.__add_superclass}>add</button></div>
		<br/>
		<table>
		<tbody>
		<tr><td>
		<input type="text" value={this.state.new_class_property_path}
	               onChange={e => this.setState({...this.state, new_class_property_path: e.target.value})}/>
		<button disabled={this.state.new_class_property_path.length==0} onClick={this.__add_new_class_property}>add</button>
		</td></tr>
		{class_property_rows}
		</tbody>
		</table>
		</Dialog>
	);
    }
};
