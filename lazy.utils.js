class LazyTypes{

    constructor(){
        if(!lazyTypesInstance){
            lazyTypesInstance = this;
        }
        return lazyTypesInstance
    }

    getFullType(value){
        return Object.prototype.toString.call(value).split(" ").pop().split("]")[0];
    }

    isArray(value){
        return this.getFullType(value) === "Array";
    }

    isObject(value){
        return this.getFullType(value) === "Object";
    }

    isString(value){
        return this.getFullType(value) === "String";
    }

    isNumber(value){
        return this.getFullType(value) === "Number";
    }

    isBoolean(value){
        return this.getFullType(value) === "Boolean";
    }

    isFunction(value){
        let type = this.getFullType(value);
        return type === "Function" || type === "AsyncFunction";
    }

}

var lazyTypesInstance = new LazyTypes();
module.exports = {
    LazyTypes: lazyTypesInstance
}